import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetCategory } from '../../../../../enums/asset-category.enum';
import {
  AssetPriceProvider,
  AssetPriceWithUnderlyingReserves,
  ComplexAsset,
} from '../../price.provider';

@Injectable()
export class OneToOneUnderlyingExchangeRatePriceProvider implements AssetPriceProvider {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly multicall: MulticallAggregator,
  ) {}

  canHandleCategories(codes: string[]): boolean {
    return (
      codes.includes(AssetCategory.WithSingleUnderlyingToken) &&
      codes.includes(AssetCategory.OneToOneUnderlyingToBaseTokenExchange)
    );
  }

  async getPrices(
    chainId: number,
    assets: ComplexAsset[],
  ): Promise<AssetPriceWithUnderlyingReserves[]> {
    return assets.map((asset) => ({
      asset: { chainId, address: asset.address },
      reserves: [],
      price: asset.underlying[0].price,
    }));
  }
}
