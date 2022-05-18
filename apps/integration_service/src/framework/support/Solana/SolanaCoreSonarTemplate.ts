import { Cache } from 'cache-manager';
import { filter, firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import { AccountService } from '../../../modules/microservices/account.service';
import { PriceService } from '../../../modules/microservices/price.service';
import { RootProtocolCacheable } from '../RootProtocolCacheable';
import { IProtocolMeta, IWalletMinimal, IWalletOpportunity, IWalletUserEntry } from '../interfaces';
import { ERC20Token } from '../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../interfaces/tokens.supplied.interface';

export abstract class SolanaCoreSonarTemplate<
  TMinimal extends IWalletMinimal,
  TOpportunity extends IWalletOpportunity,
  TUserEntry extends IWalletUserEntry,
  TProtocol extends IProtocolMeta = IProtocolMeta,
> extends RootProtocolCacheable<TMinimal, TOpportunity, TUserEntry, TProtocol> {
  // Common Services (Injected)
  protected abstract logger: Logger;
  protected abstract cache: Cache;

  // TODO: use new asset service :)
  protected abstract accountService: AccountService;
  protected abstract priceService: PriceService;
  protected abstract httpService: HttpService;
  protected abstract configService: ConfigService;

  protected async getTokensForOpportunities(opportunities: TMinimal[]): Promise<Map<Address, any>> {
    // get all the token addresses from the pools
    const addresses = this.getUniqueTokensFromRawPools(opportunities);

    // get all the priced tokens (including underlying tokens)
    const tokens = await this.getOrSet(
      60,
      `cached_token_response_${this.meta.chain}_${this.protocolId}`,
      () => this.updateTokensForOpportunities(opportunities, addresses),
    );
    // return tokens
    return new Map(tokens);
  }

  protected async updateTokensForOpportunities(opportunities: TMinimal[], addresses: string[]) {
    const tokens = await this.getTokens(addresses);
    const tokensMap = new Map(tokens);

    const sonarData = await this.getSonarData();
    const sonarMap = new Map(sonarData.map((sonar) => [sonar.address, sonar]));

    const updatedTokens: [string, ERC20Token][] = [];
    for (const opportunity of opportunities) {
      const address = opportunity.supplied[0].token.address;

      if (sonarMap.has(opportunity.id) && tokensMap.has(address)) {
        const sonarLP = sonarMap.get(opportunity.id);
        const token = tokensMap.get(address);
        if (sonarLP.lp.value === 0) continue;
        if (!token) continue;
        if (sonarLP.rewardAssets.some((x) => !tokensMap.get(x.mint))) continue;

        updatedTokens.push([
          opportunity.id,
          {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            price: sonarLP.lp.price,
            reserve: sonarLP.lp.amount,
            totalSupply: sonarLP.lp.supply,
            value: sonarLP.lp.value,
            underlying: sonarLP.lp.assets
              .filter((t) => tokensMap.get(t.mint))
              .map((asset) => {
                const token = tokensMap.get(asset.mint);
                return {
                  address: asset.mint,
                  symbol: token?.symbol,
                  name: token?.name,
                  decimals: token?.decimals,
                  price: asset.price,
                  reserve: asset.amount,
                };
              }),
          },
        ]);

        sonarLP.rewardAssets.map((asset) => {
          const token = tokensMap.get(asset.mint);
          updatedTokens.push([
            asset.mint,
            {
              address: token.address,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              price: sonarLP.lp.price,
            },
          ]);
        });
      }
    }

    return updatedTokens;
  }

  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const apy = this.formatSupplyApy?.(supplied);
    return {
      token,
      apy,
      totalSupplied: normalizeDecimals(supplied.totalSupplied, token.decimals),
      totalSupply: normalizeDecimals(token.totalSupply.toString(), token.decimals), // TODO: Move into token
      tvl: token.value,
    };
  }

  private async getSonarData() {
    return firstValueFrom(
      this.httpService.get('https://api.sonar.watch/latest/farms').pipe(
        mergeMap((response) => Object.values(response.data)),
        filter((protocol: any) => protocol.method === 'quarry_farm'),
        mergeMap((pool) => [pool, ...pool.additional.replicaFarms]),
        toArray(),
      ),
    );
  }
}
