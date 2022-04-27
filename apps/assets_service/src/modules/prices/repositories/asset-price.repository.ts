import { EntityRepository, Repository } from 'typeorm';

import { AssetsPriceEntity } from '../entities/assets-price.entity';
import { AssetPriceCandle } from '../types/AssetPriceCandle.type';

@EntityRepository(AssetsPriceEntity)
export class AssetsPriceRepository extends Repository<AssetsPriceEntity> {
  public findAssetCurrentPrices(assetId: number): Promise<AssetsPriceEntity[]> {
    const q = this.createQueryBuilder('assets_prices') //
      .distinctOn(['source_id'])
      .where('asset_id = :assetId', { assetId })
      .orderBy('source_id')
      .addOrderBy('created_at', 'DESC');
    return q.getMany();
  }

  public getAssetPriceCandles(
    assetId: number,
    timeGranularity: number,
  ): Promise<AssetPriceCandle[]> {
    return this.query(`
    SELECT  
      DATE_TRUNC('hour', "timestamp") + INTERVAL '1' MINUTE * ((ROUND(EXTRACT(MINUTE FROM "timestamp"))::integer / ${timeGranularity}) + 1) * ${timeGranularity} AS "time",
      (ARRAY_AGG(price ORDER BY "timestamp" ASC))[1] "open",
      MAX(price) "high",
      MIN(price) "low",
      (ARRAY_AGG(price ORDER BY "timestamp" DESC))[1] "close",
      COUNT(*) "ticks",
      asset_id AS "assetId",
      ${timeGranularity} "timeGranularity"
    FROM assets_prices AS apr
    WHERE apr.asset_id IN (${assetId}) 
    GROUP BY "time", "asset_id"
    ORDER BY "time" DESC  
    LIMIT 60;
    `);
  }
}
