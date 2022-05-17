import { EntityRepository, Repository } from 'typeorm';

import { AssetHistoricalPriceEntity } from '../entities/asset-historical-price.entity';

@EntityRepository(AssetHistoricalPriceEntity)
export class AssetsHistoricalPriceRepository extends Repository<AssetHistoricalPriceEntity> {
  public async updateAssetPrices(
    assetsHistoricalPrices: AssetHistoricalPriceEntity[],
  ): Promise<void> {
    await this.upsert(assetsHistoricalPrices, ['asset_id', 'timestamp', 'time_granularity']);
  }
}
