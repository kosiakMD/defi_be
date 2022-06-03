import { Between, EntityRepository, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { HistoricalPriceRequest } from '../../assets/types/historical-price-request.type';
import { AssetHistoricalPriceEntity } from '../entities/asset-historical-price.entity';

@Injectable()
@EntityRepository(AssetHistoricalPriceEntity)
export class AssetsHistoricalPriceRepository extends Repository<AssetHistoricalPriceEntity> {
  public getPrices(requests: HistoricalPriceRequest[]) {
    return this.find({
      where: requests.flatMap(({ assetId, pricesAt }) =>
        pricesAt.map((priceAt) => {
          const timeRange = getTimeRange(priceAt);
          return {
            asset: {
              id: assetId,
            },
            timestamp: Between(new Date(priceAt - timeRange), new Date(priceAt + timeRange)),
          };
        }),
      ),
      relations: ['asset'],
    });
  }

  public clearPrices() {
    return (
      this.createQueryBuilder('assets_historical_prices')
        .delete()
        // clear H1 prices which older than 2 days
        .where(
          `"timestamp" < CURRENT_TIMESTAMP - INTERVAL '2' DAY AND
        "id" NOT IN (
          SELECT "id" FROM (
            SELECT 
              DATE_TRUNC('hour', "timestamp") "time",
              (ARRAY_AGG("id" ORDER BY "timestamp" ASC))[1] "id"
            FROM assets_historical_prices ahp
            GROUP BY "time", "asset_id"
            ORDER BY "time" DESC
          ) ids
        )
        `,
        )
        // clear H4 prices which older than 7 days
        .orWhere(
          `"timestamp" < CURRENT_TIMESTAMP - INTERVAL '7' DAY AND EXTRACT(HOUR FROM "timestamp") NOT IN (0, 4, 8, 12, 16, 20)`,
        )
        .execute()
    );
  }
}

function getTimeRange(priceAt: number): number {
  const now = Date.now();
  const timeDiff = Math.abs(now - priceAt);
  const isPariceAtIn2Days = timeDiff < 2 * 24 * 60 * 60 * 1000;
  const isPariceAtIn7Days = timeDiff < 7 * 24 * 60 * 60 * 1000;
  return isPariceAtIn2Days ? 15 * 60 * 1000 : isPariceAtIn7Days ? 60 * 60 * 1000 : 240 * 60 * 1000;
}
