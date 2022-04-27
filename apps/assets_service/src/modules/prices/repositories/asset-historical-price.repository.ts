import { HistoricalPricesQuery } from 'apps/assets_service/src/common/dto/HistoricalPricesQuery.dto';
import { EntityRepository, Repository } from 'typeorm';

import { AssetsHistoricalPriceEntity } from '../entities/assets-historical-price.entity';

@EntityRepository(AssetsHistoricalPriceEntity)
export class AssetsHistoricalPriceRepository extends Repository<AssetsHistoricalPriceEntity> {
  public findAssetHistoricalPrices(
    assetId: number,
    historicalPricesQuery: HistoricalPricesQuery,
    timeGranularity: number,
  ): Promise<AssetsHistoricalPriceEntity[]> {
    const { pricesStart, pricesEnd } = historicalPricesQuery;
    const q = this.createQueryBuilder('assets_historical_prices') //
      .where('asset_id = :assetId', { assetId })
      .andWhere('time_granularity = :timeGranularity', { timeGranularity })
      .andWhere('"timestamp" BETWEEN :pricesStart AND :pricesEnd', {
        pricesStart,
        pricesEnd,
      })
      .orderBy('"timestamp"', 'DESC');
    return q.getMany();
  }

  public async updateAssetPrices(
    assetsHistoricalPrices: AssetsHistoricalPriceEntity[],
  ): Promise<void> {
    await this.upsert(assetsHistoricalPrices, ['assetId', 'timestamp', 'timeGranularity']);
  }
}
