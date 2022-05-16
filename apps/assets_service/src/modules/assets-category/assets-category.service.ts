import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CrudService } from '@app/common/services/crud.service';

import { AssetCategoryEntity } from './entities/asset-category.entity';

@Injectable()
export class AssetsCategoryService extends CrudService<AssetCategoryEntity> {
  constructor(
    @InjectRepository(AssetCategoryEntity)
    private readonly assetsCategoryRepository: Repository<AssetCategoryEntity>,
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
