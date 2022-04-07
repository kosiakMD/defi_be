import { EntityRepository, Repository } from 'typeorm';

import { AssetsPriceEntity } from '../entities/assets-price.entity';

@EntityRepository(AssetsPriceEntity)
export class AssetsPriceRepository extends Repository<AssetsPriceEntity> {}
