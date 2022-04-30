import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import { AccountService } from '../../../modules/microservices/account.service';
import { PriceService } from '../../../modules/microservices/price.service';
import { RootProtocol } from '../RootProtocol';
import { IWalletMinimal, IWalletOpportunity, IWalletUserEntry } from '../interfaces';

export abstract class SolanaCore<
  TMinimalType extends IWalletMinimal,
  TOpportunityType extends IWalletOpportunity,
  TUserEntryType extends IWalletUserEntry,
> extends RootProtocol<TMinimalType, TOpportunityType, TUserEntryType> {
  // Common Services (Injected)
  protected abstract logger: Logger;
  protected abstract cache: Cache;

  // TODO: use new asset service :)
  protected abstract accountService: AccountService;
  protected abstract priceService: PriceService;
  protected abstract httpService: HttpService;
  protected abstract configService: ConfigService;

  protected async getTokens(addresses: Address[]): Promise<[Address, any][]> {
    // This retrieves a list of all registered tokens on solana
    // const tokenList = await new TokenListProvider().resolve();
    // const tokens = tokenList.filterByChainId(Number(getAbsoluteChainId(ChainIdEnum.sol))).getList();
    const NATIVE_SOL = '11111111111111111111111111111111';
    const WRAPPED_SOL = 'So11111111111111111111111111111111111111112';

    //  we add the wrapped token to get the native tokens price
    //  (coingecko doesn't report the native tokens price by address)
    //  WRAPPED_SOL,
    // :TODO: removed since we can't use coingecko for getting prices to need to find a way not to use api.sonar.prices
    const tokensWithNativeAndWrapped = Array.from(new Set(addresses.concat(WRAPPED_SOL)));

    /** @todo need to find a way to extract solana prices */
    const [{ prices }, { data: tokens }, { data: supplies }] = await Promise.all([
      // Coingecko prices
      this.priceService.getTokenPricesFetch(tokensWithNativeAndWrapped, this.meta.chain),
      // Account Service
      this.accountService.getAssets(tokensWithNativeAndWrapped, [ChainIdEnum.sol]),
      // RPC to get token supplies
      firstValueFrom(
        this.httpService.post(
          this.configService.get('SOL_URL'),
          tokensWithNativeAndWrapped.map((address) => ({
            jsonrpc: '2.0',
            id: address,
            method: 'getTokenSupply',
            params: [address],
          })),
        ),
      ),
    ]);

    // Set native sol price since coingecko doesn't look up native token by address
    prices[NATIVE_SOL] = prices[WRAPPED_SOL];

    const supplyMap = new Map();
    supplies.forEach((supply) => {
      if (supply.result?.value && !supply.error) {
        return supplyMap.set(
          supply.id,
          normalizeDecimals(supply.result.value.amount, supply.result.value.decimals),
        );
      }
    });

    return tokens
      .filter((token) => addresses.includes(token.address))
      .map((token): [Address, any] => {
        return [
          token.address,
          {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            reserve: supplyMap.get(token.address),
            totalSupply: supplyMap.get(token.address),
            price: prices[token.address] || 0,
          },
        ];
      });
  }
}
