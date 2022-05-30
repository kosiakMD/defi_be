import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CrudService } from '@app/common/services/crud.service';

import { AssetCategoryEntity } from './entities/asset-category.entity';
import { AssetsCategoryRepository } from './repositories/assets-category.repository';

@Injectable()
export class AssetsCategoryService extends CrudService<AssetCategoryEntity> {
  constructor(
    @InjectRepository(AssetsCategoryRepository)
    private readonly assetsCategoryRepository: AssetsCategoryRepository,
  ) {
    super(assetsCategoryRepository);
  }

  public async findAll() {
    return await this.getAll();
  }

  public async findOne(id: number) {
    return await this.get({ id });
  }
}
