import { EntityRepository, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { AssetHistoricalPriceEntity } from '../entities/asset-historical-price.entity';

@Injectable()
@EntityRepository(AssetHistoricalPriceEntity)
export class AssetsHistoricalPriceRepository extends Repository<AssetHistoricalPriceEntity> {
  public clearPrices() {
    return this.createQueryBuilder('assets_historical_prices')
      .delete()
      .where(
        `"timestamp" < CURRENT_TIMESTAMP - INTERVAL '2' DAY AND EXTRACT(MINUTE FROM "timestamp") > 0`,
      )
      .orWhere(
        `"timestamp" < CURRENT_TIMESTAMP - INTERVAL '7' DAY AND EXTRACT(HOUR FROM "timestamp") NOT IN (0, 4, 8, 12, 16, 20)`,
      )
      .execute();
  }
}
