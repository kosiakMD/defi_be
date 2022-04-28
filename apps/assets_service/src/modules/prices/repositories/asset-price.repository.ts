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
    let queryString;
    switch (timeGranularity) {
      case 60:
        queryString = this.getH1CandlesQuery(assetId, timeGranularity);
        break;
      case 240:
        queryString = this.getH4CandlesQuery(assetId, timeGranularity);
        break;
      default:
        queryString = this.getM15CandlesQuery(assetId, timeGranularity);
    }
    return this.query(queryString);
  }

  private getM15CandlesQuery(assetId: number, timeGranularity: number): string {
    return `
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
    WHERE apr.asset_id = ${assetId}
    GROUP BY "time", "asset_id"
    ORDER BY "time" DESC  
    LIMIT 60;
    `;
  }

  private getH1CandlesQuery(assetId: number, timeGranularity: number): string {
    return `
    SELECT  
      DATE_TRUNC('hour', "timestamp") AS "time",
      (ARRAY_AGG(price ORDER BY "timestamp" ASC))[1] "open",
      MAX(price) "high",
      MIN(price) "low",
      (ARRAY_AGG(price ORDER BY "timestamp" DESC))[1] "close",
      COUNT(*) "ticks",
      asset_id AS "assetId",
      ${timeGranularity} "timeGranularity"
    FROM assets_prices AS apr
    WHERE apr.asset_id = ${assetId}
    GROUP BY "time", "asset_id"
    ORDER BY "time" DESC  
    LIMIT 60;
    `;
  }

  private getH4CandlesQuery(assetId: number, timeGranularity: number): string {
    return `
    SELECT  
      CASE
      WHEN (EXTRACT(HOUR FROM "timestamp") / 4) > 5
        THEN DATE_TRUNC('day', "timestamp") + INTERVAL '24' HOUR
      WHEN (EXTRACT(HOUR FROM "timestamp") / 4) > 4
        THEN DATE_TRUNC('day', "timestamp") + INTERVAL '20' HOUR
      WHEN (EXTRACT(HOUR FROM "timestamp") / 4) > 3
        THEN DATE_TRUNC('day', "timestamp") + INTERVAL '16' HOUR
      WHEN (EXTRACT(HOUR FROM "timestamp") / 4) > 2
        THEN DATE_TRUNC('day', "timestamp") + INTERVAL '12' HOUR
      WHEN (EXTRACT(HOUR FROM "timestamp") / 4) > 1
        THEN DATE_TRUNC('day', "timestamp") + INTERVAL '8' HOUR
      ELSE DATE_TRUNC('day', "timestamp")
        END AS "time",
      (ARRAY_AGG(price ORDER BY "timestamp" ASC))[1] "open",
      MAX(price) "high",
      MIN(price) "low",
      (ARRAY_AGG(price ORDER BY "timestamp" DESC))[1] "close",
      COUNT(*) "ticks",
      asset_id AS "assetId",
      ${timeGranularity} "timeGranularity"
    FROM assets_prices AS apr
    WHERE apr.asset_id = ${assetId}
    GROUP BY "time", "asset_id"
    ORDER BY "time" DESC  
    LIMIT 60;
    `;
  }
}
