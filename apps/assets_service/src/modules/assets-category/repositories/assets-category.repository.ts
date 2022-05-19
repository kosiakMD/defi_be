import { EntityRepository, Repository } from 'typeorm';

import { AssetCategoryEntity } from '../entities/asset-category.entity';

@EntityRepository(AssetCategoryEntity)
export class AssetsCategoryRepository extends Repository<AssetCategoryEntity> {
  findOneByCode(code: string): Promise<AssetCategoryEntity> {
    return this.findOne({
      where: { code },
    });
  }
}
