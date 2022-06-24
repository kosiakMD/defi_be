import { AssetRequestObjectInterface, AssembledAssetInterface } from '@sdk/assets/interfaces';

import { Injectable } from '@nestjs/common';

import { normalizeDecimals } from '@app/common/utils';

import { AssetService } from './asset.service';
import { PriceService } from './price.service';
import { BeefyAutofarmLpStrategy } from './strategies/beefy-autofarm.v2.asset.strategy';

@Injectable()
export class BeefyAutofarmAssetService {
  constructor(
    protected assetService: AssetService,
    protected priceService: PriceService,
    protected dataStrategy: BeefyAutofarmLpStrategy,
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
        const addresses = Array.from(
          new Set(
            requests.reduce(
              (acc, cur) => (cur.chainId === chain ? acc.concat(cur.address) : acc),
              [],
            ),
          ),
        );
        const assetsRequest = addresses.map((address) => ({ address, chainId: chains[0] }));

        const tokens = await this.assetService.getAssets(assetsRequest);
        try {
          const { tokens: updatedTokens } = this.dataStrategy
            ? await this.dataStrategy.fillMissingData([...tokens], [], chain)
            : { tokens };
          return updatedTokens;
        } catch (error) {
          return tokens.map((token) => {
            token[1].underlying.forEach((underlying) => {
              if (underlying.reserve) {
                underlying.reserve = normalizeDecimals(
                  underlying.reserve.toString(),
                  underlying.decimals,
                );
              }
              return underlying;
            });
            return token;
          });
        }
      }),
    );

    return allTokens.flat();
  }
}
