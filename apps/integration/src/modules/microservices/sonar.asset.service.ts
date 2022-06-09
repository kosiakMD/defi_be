import {
  AssembledAssetInterface,
  AssetRequestObjectInterface,
  AssetServiceInterface,
} from '@sdk/assets/interfaces';
import { filter, firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '@app/common';

import { AccountService } from './account.service';
import { FakeAssetService } from './fake.asset.service';
import { PriceService } from './price.service';

@Injectable()
export class SonarAssetService extends FakeAssetService implements AssetServiceInterface {
  constructor(
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {
    super(accountService, priceService);
  }

  async getAsset(address: string, chainId: number): Promise<AssembledAssetInterface> {
    const [[, asset]] = await this.getAssets([{ address, chainId }]);
    return asset;
  }

  async getAssets(
    requests: AssetRequestObjectInterface[],
  ): Promise<[string, AssembledAssetInterface][]> {
    return this.getSonarAssets(requests.map((a) => a.address));
  }

  protected async getSonarAssets(addresses: string[]) {
    const sonarData = await this.getSonarData();

    // @notice:
    // not accurate since assets should be sorted per farm
    // however we don't have the opportunities available here
    // and wont when we switch to the new asset service
    const sonarMap = new Map(
      sonarData
        .flatMap((sonar) => [sonar.lp, ...sonar.rewardAssets, ...sonar.lp.assets])
        .map((s) => [s.mint, s]),
    );

    const tokens = await super.getAssets(
      addresses
        .concat(...sonarMap.keys())
        .map((address) => ({ address, chainId: ChainIdEnum.sol })),
    );

    const tokensMap = new Map(tokens);

    const updatedTokens: [string, any][] = []; // [string, token]
    for (const address of addresses) {
      if (sonarMap.has(address) && tokensMap.has(address)) {
        const sonarToken = sonarMap.get(address);
        const token = tokensMap.get(address);
        if (sonarToken.value === 0) {
          continue;
        }

        if (!token) {
          continue;
        }

        if (sonarToken.assets?.length && !sonarToken.assets.every((t) => tokensMap.has(t.mint))) {
          continue;
        }

        updatedTokens.push([
          address,
          {
            id: token.id,
            chainId: token.chainId,
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            reserve: sonarToken.amount,
            totalSupply: sonarToken.supply,
            price: sonarToken.price,
            displayName: token.symbol,
            categories: [],
            underlying: sonarToken.assets
              ?.map((asset) => {
                const token = tokensMap.get(asset.mint);
                if (!token) return;
                return {
                  id: token.id,
                  chainId: token?.chainId,
                  address: asset.mint,
                  name: token?.name,
                  symbol: token?.symbol,
                  displayName: token?.symbol,
                  decimals: token?.decimals,
                  reserve: asset.amount,
                  price: asset.price,
                  categories: [],
                };
              })
              .filter(Boolean),
          },
        ]);
      }
    }
    return updatedTokens;
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

  // return tokens
  //   .filter((token) => addresses.includes(token.address))
  //   .map((token): [Address, any] => {
  //     return [
  //       token.address,
  //       {
  //         id: token.id,
  //         chainId: ChainIdEnum.sol,
  //         address: token.address,
  //         name: token.name,
  //         symbol: token.symbol,
  //         decimals: token.decimals,
  //         reserve: supplyMap.get(token.address),
  //         totalSupply: supplyMap.get(token.address),
  //         price: Number(prices[token.address] || 0),
  //         displayName: token.symbol,
  //         categories: [],
  //         underlying: [],
  //       },
  //     ];
  //   });
}
