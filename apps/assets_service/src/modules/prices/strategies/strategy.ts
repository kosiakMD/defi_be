import { Logger } from '@nestjs/common';

import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetPrice } from '../types/AssetPrice.type';
import { PriceJobData } from '../types/PriceJobData.type';

export abstract class PriceStrategy {
  private readonly logger = new Logger();

  public abstract fetchPrices(
    priceJobData: PriceJobData,
    assetsRepository?: AssetsRepository,
  ): Promise<AssetPrice[]>;

  protected handleFailResponse(error: Error): void {
    this.logger.error(error);
  }
}
