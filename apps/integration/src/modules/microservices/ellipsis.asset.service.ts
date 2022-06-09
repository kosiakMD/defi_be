import {
  AssembledAssetInterface,
  AssetRequestObjectInterface,
  AssetServiceInterface,
} from '@sdk/assets/interfaces';

import { Injectable } from '@nestjs/common';

import { CurveAssetsManager } from '../../framework/support/assets/curve.assets.manager';

@Injectable()
export class EllipsisAssetService implements AssetServiceInterface {
  constructor(protected curveAssetManager: CurveAssetsManager) {}

  async getAsset(address: string, chainId: number): Promise<AssembledAssetInterface> {
    const [[, asset]] = await this.getAssets([{ address, chainId }]);
    return asset;
  }

  async getAssets(
    requests: AssetRequestObjectInterface[],
  ): Promise<[string, AssembledAssetInterface][]> {
    const chains = [...new Set(requests.map((r) => r.chainId))];
    const results = await Promise.all(
      chains.map(async (chain) => {
        const addresses = [...new Set(requests.map((a) => a.address))];
        const assets = await this.curveAssetManager.getTokens(addresses, chain);
        return assets.map(([address, token]) => {
          return [address, this.mapEllipsisTV3(token)];
        });
      }),
    );

    return results.flat();
  }

  private mapEllipsisTV3(token): AssembledAssetInterface {
    return {
      id: token.id,
      chainId: (token as any).chain || token.chainId, // incorrectly typed as chainId

      address: token.address,
      decimals: token.decimals,
      name: token.name,
      symbol: token.symbol,
      totalSupply: token.totalSupply,

      displayName: token.symbol,
      price: token.price,

      reserve: token.reserve,
      categories: [],
      //   historicalPrices?: AssetHistoricalPriceInterface[];
      underlying: token.underlying?.map((asset) => this.mapEllipsisTV3(asset)),
    };
  }
}
