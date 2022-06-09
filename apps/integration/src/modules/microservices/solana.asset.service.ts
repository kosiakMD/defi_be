import {
  AssembledAssetInterface,
  AssetRequestObjectInterface,
  AssetServiceInterface,
} from '@sdk/assets/interfaces';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainIdEnum } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import { AccountService } from './account.service';
import { PriceService } from './price.service';
import { TokenDataStrategy } from './strategies/strategy.interface';

@Injectable()
export class SolanaAssetService implements AssetServiceInterface {
  protected dataStrategy?: TokenDataStrategy;
  constructor(
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
    protected configService: ConfigService,
  ) {}

  async getAsset(address: string, chainId: number): Promise<AssembledAssetInterface> {
    const [[, asset]] = await this.getAssets([{ address, chainId }]);
    return asset;
  }

  async getAssets(
    requests: AssetRequestObjectInterface[],
  ): Promise<[string, AssembledAssetInterface][]> {
    return this.getSolanaTokens(requests.map((a) => a.address));
  }

  private async getSolanaTokens(addresses: Address[]): Promise<[Address, any][]> {
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
      this.priceService.getTokenPricesFetch(tokensWithNativeAndWrapped, ChainIdEnum.sol),
      // Account Service
      this.accountService.getAssets(tokensWithNativeAndWrapped, [ChainIdEnum.sol]),
      // RPC to get token supplies
      firstValueFrom(
        this.httpService.post(
          // TODO: SOL_URL or SOLANA_URL
          this.configService.get('SOL_URL'),
          tokensWithNativeAndWrapped.map((address) => ({
            jsonrpc: '2.0',
            id: address,
            method: 'getTokenSupply',
            params: [address],
          })),
        ),
      ).catch(() => null),
    ]);
    // Set native sol price since coingecko doesn't look up native token by address
    prices[NATIVE_SOL] = prices[WRAPPED_SOL];

    const supplyMap = new Map();
    if (Array.isArray(supplies)) {
      supplies.forEach((supply) => {
        if (supply.result?.value && !supply.error) {
          return supplyMap.set(
            supply.id,
            normalizeDecimals(supply.result.value.amount, supply.result.value.decimals),
          );
        }
      });
    }
    return tokens
      .filter((token) => addresses.includes(token.address))
      .map((token): [Address, any] => {
        return [
          token.address,
          {
            id: token.id,
            chainId: ChainIdEnum.sol,
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            reserve: supplyMap.get(token.address),
            totalSupply: supplyMap.get(token.address),
            price: Number(prices[token.address] || 0),
            displayName: token.symbol,
            categories: [],
            underlying: [],
          },
        ];
      });
  }
}
