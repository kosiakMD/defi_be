import {
  AssembledAssetInterface,
  AssetRequestObjectInterface,
  AssetServiceInterface,
} from '@sdk/assets/interfaces';

import { Injectable } from '@nestjs/common';

import { MuesliSwapAccountService } from './MuesliSwapAccountService';
import { MuesliSwapPriceService } from './MuesliSwapPriceService';

/**
 * This is a copy/paste of FakeAssetService, however I couldn't get the types to behave
 * for the mismatched priceServices so I just copy pasted the required code over.
 * When updating to the actual asset service this will be removed
 */
@Injectable()
export class MuesliSwapAssetService implements AssetServiceInterface {
  constructor(
    protected accountService: MuesliSwapAccountService,
    protected priceService: MuesliSwapPriceService,
  ) {}

  async getAsset(address: string, chainId: number): Promise<AssembledAssetInterface> {
    const [[, asset]] = await this.getAssets([{ address, chainId }]);
    return asset;
  }

  async getAssets(
    requests: AssetRequestObjectInterface[],
  ): Promise<[string, AssembledAssetInterface][]> {
    // get unique list of requested chains
    const chains = Array.from(new Set(requests.map((c) => c.chainId)));

    const allTokens = await Promise.all(
      chains.map(async (chain) => {
        // get requested addresses for this chain
        const addresses: string[] = Array.from(
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
        const { prices } = await this.priceService.getTokenPricesFetch(addresses, chain);

        // merge and format
        return tokens.map((token: any): [string, AssembledAssetInterface] => [
          token.address,
          this.mapV2ToV3Interface(token, prices),
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
    } as any; // as any is needed as reserve & totalSupply are not in the interface yet
  }
}
