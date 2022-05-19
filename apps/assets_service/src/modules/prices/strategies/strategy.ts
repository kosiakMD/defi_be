import { Logger } from '@nestjs/common';

import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetPrice } from '../types/asset-price.type';
import { PriceJobData } from '../types/price-job-data.type';

export abstract class PriceStrategy {
  protected readonly logger = new Logger();

  public abstract fetchPrices(
    priceJobData: PriceJobData,
    assetsRepository?: AssetsRepository,
  ): Promise<AssetPrice[]>;

  protected handleFailResponse(error: Error): void {
    this.logger.error(error);
  }
}
