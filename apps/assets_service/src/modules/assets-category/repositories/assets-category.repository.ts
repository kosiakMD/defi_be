import { EntityRepository, Repository } from 'typeorm';

import { AssetsCategoryEntity } from '../entities/assets-category.entity';

@EntityRepository(AssetsCategoryEntity)
export class AssetsCategoryRepository extends Repository<AssetsCategoryEntity> {
  findOneByName(name: string): Promise<AssetsCategoryEntity> {
    return this.findOne({
      where: { name },
    });
  }
}
