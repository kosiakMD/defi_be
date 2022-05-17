import { EntityRepository, Repository } from 'typeorm';

import { AssetHistoricalPriceEntity } from '../entities/asset-historical-price.entity';

@EntityRepository(AssetHistoricalPriceEntity)
export class AssetsHistoricalPriceRepository extends Repository<AssetHistoricalPriceEntity> {}
