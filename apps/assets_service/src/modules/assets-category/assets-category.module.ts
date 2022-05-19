import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsCategoryController } from '../../controllers/assets-category.controller';
import { AssetsModule } from '../assets/assets.module';
import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetsCategoryService } from './assets-category.service';
import { AssetCategoryEntity } from './entities/asset-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetCategoryEntity, AssetsRepository]),
    HttpModule,
    AssetsModule,
  ],
  controllers: [AssetsCategoryController],
  providers: [AssetsCategoryService],
})
export class AssetsCategoryModule {}
