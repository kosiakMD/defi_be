/* eslint-disable max-classes-per-file */
import { Injectable } from '@nestjs/common';

import { AccountService } from './account.service';
import {
  AssembledAssetInterface,
  AssetRequestInterface,
  AssetServiceInterface,
} from './asset.service.interface';
import { PriceService } from './price.service';
import { TokenDataStrategy } from './strategies/strategy.interface';

@Injectable()
export class FakeAssetService implements AssetServiceInterface {
  protected dataStrategy?: TokenDataStrategy;
  constructor(protected accountService: AccountService, protected priceService: PriceService) {}

  async getAsset(address: string, chainId: number): Promise<AssembledAssetInterface> {
    const [[, asset]] = await this.getAssets([{ address, chainId }]);
    return asset;
  }

  async getAssets(requests: AssetRequestInterface[]): Promise<[string, AssembledAssetInterface][]> {
    // get unique list of requested chains
    const chains = Array.from(new Set(requests.map((c) => c.chainId)));
    const allTokens = await Promise.all(
      chains.map(async (chain) => {
        // get requested addresses for this chain
        const addresses = Array.from(
          new Set(
            requests.reduce(
              (acc, cur) => (cur.chainId === chain ? acc.concat(cur.address) : acc),
              [],
            ),
          ),
        );

        // fetch assets
        const { data: tokens } = await this.accountService.getAssets(addresses, [chain]);

        // fetch prices
        const { prices } = await this.priceService.getTokenPricesFetch(
          this.getAllAddresses(tokens),
          chain,
        );

        const { tokens: updatedTokens, prices: updatedPrices } = this.dataStrategy
          ? await this.dataStrategy.fillMissingData(tokens, prices, chain)
          : { tokens, prices };

        // merge and format
        return updatedTokens.map((token: any): [string, AssembledAssetInterface] => [
          token.address,
          this.mapV2ToV3Interface(token, updatedPrices),
        ]);
      }),
    );

    return allTokens.flat();
  }

  /**
   * Formats the v2 token tot he new assets service interface
   */
  private mapV2ToV3Interface(token: any, prices): AssembledAssetInterface {
    return {
      id: token.id,
      chainId: (token as any).chain || token.chainId, // incorrectly typed as chainId

      address: token.address,
      decimals: token.decimals,
      name: token.name,
      symbol: token.symbol,
      // totalSupply?: string;

      displayName: token.symbol,
      price: Number(prices[token.address]),

      reserve: token.reserve,
      totalSupply: token.totalSupply,
      // rank?: number;
      // icon?: string;

      // lp metadata
      // position:
      // weight
      // reserves

      // isTracked?: boolean;
      // disabled?: boolean;
      categories: [],
      //   historicalPrices?: AssetHistoricalPriceInterface[];
      underlying: token.underlyingAssets?.map((asset) => this.mapV2ToV3Interface(asset, prices)),
    }; // as any is needed as reserve & totalSupply are not in the interface yet
  }

  private getAllAddresses(tokens: any[]): string[] {
    return Array.from(
      tokens.reduce((res, t) => {
        res.add(t.address);
        if (t.underlyingAssets) {
          t.underlyingAssets.forEach((ua) => {
            res.add(ua.address);
          });
        }
        return res;
      }, new Set<string>()),
    );
  }
}
