import { EntityRepository, FindManyOptions, Repository } from 'typeorm';

import { AssetsListQueryDto } from '../../assets/dto/AssetsListQuery.dto';
import { AssetsEntity } from '../entities';

@EntityRepository(AssetsEntity)
export class AssetsRepository extends Repository<AssetsEntity> {
  findAllAssets(queryParams: AssetsListQueryDto): Promise<AssetsEntity[]> {
    const { limit, page, sortDirection, sortField } = queryParams;
    const findManyOptions: FindManyOptions = { skip: (page - 1) * limit, take: limit };
    if (sortField && sortDirection) {
      findManyOptions.order = {};
      findManyOptions.order[sortField] = sortDirection;
    }
    return this.find(findManyOptions);
  }

  findById(assetId: number): Promise<AssetsEntity> {
    return this.findOne({ id: assetId });
  }

  // TODO implement NewAssetDto
  insertOne(newAssets: any): Promise<AssetsEntity> {
    return this.save(newAssets);
  }

  // TODO implement AssetUpdatesDto
  async updateItem(assetId: number, updates: any): Promise<AssetsEntity> {
    await this.update(assetId, updates);
    return this.findById(assetId);
  }

  async deleteItem(id: number): Promise<void> {
    await this.delete(id);
  }
}
