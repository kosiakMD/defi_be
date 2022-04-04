import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CrudService } from '@app/common/services/crud.service';

import { CreateAssetsCategoryDto } from './dto/create-assets-category.dto';
import { UpdateAssetsCategoryDto } from './dto/update-assets-category.dto';
import { AssetsCategoryEntity } from './entities/assets-category.entity';

@Injectable()
export class AssetsCategoryService extends CrudService<AssetsCategoryEntity> {
  constructor(
    @InjectRepository(AssetsCategoryEntity)
    private readonly assetsCategoryRepository: Repository<AssetsCategoryEntity>,
  ) {
    super(assetsCategoryRepository);
  }

  public async createOne(createAssetsCategoryDto: CreateAssetsCategoryDto) {
    await this.create(createAssetsCategoryDto);
  }

  public async findAll() {
    return await this.getAll();
  }

  public async findOne(id: number) {
    return await this.get({ id });
  }

  public async update(id: number, updateAssetsCategoryDto: UpdateAssetsCategoryDto) {
    return await this.patch(id, updateAssetsCategoryDto);
  }

  public async remove(id: number) {
    return this.deleteOne(id);
  }
}
