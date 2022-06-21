import BigNumber from 'bignumber.js';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetCategory } from '../../../enums/asset-category.enum';
import {
  AssetPriceProvider,
  AssetPriceWithUnderlyingReserves,
  ComplexAsset,
} from './price.provider';

@Injectable()
export class SingleUnderlyingTokenPriceProvider implements AssetPriceProvider {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {}

  canHandleCategories(codes: string[]): boolean {
    return (
      codes.includes(AssetCategory.WithSingleUnderlyingToken) &&
      codes.includes(AssetCategory.UnderlyingBalanceHeldByBaseContract)
    );
  }

  async getPrices(
    chainId: number,
    assets: ComplexAsset[],
  ): Promise<AssetPriceWithUnderlyingReserves[]> {
    const baseTokenTotalSupplyPromise = this.multicall.callArray(
      assets.map((asset) => {
        const contract = new ERC20(asset.address);
        return contract.totalSupply();
      }),
      chainId,
    );

    const underlyingTokenHeldByBaseContractPromise = this.multicall.callArray(
      assets.map((asset) => {
        const contract = new ERC20(asset.underlying[0].address);
        return contract.balanceOf(asset.address);
      }),
      chainId,
    );

    const [baseTokenTotalSupply, underlyingTokenHeldByBaseContract] = await Promise.all([
      baseTokenTotalSupplyPromise,
      underlyingTokenHeldByBaseContractPromise,
    ]);

    return assets.map((asset, index) => ({
      asset: { chainId, address: asset.address },
      reserves: [underlyingTokenHeldByBaseContract[index].toFixed()],
      price: new BigNumber(normalizeDecimals(baseTokenTotalSupply[index], asset.decimals))
        .dividedBy(
          new BigNumber(
            normalizeDecimals(
              underlyingTokenHeldByBaseContract[index],
              asset.underlying[0].decimals,
            ),
          ),
        )
        .multipliedBy(new BigNumber(asset.underlying[0].price))
        .toNumber(),
    }));
  }
}
