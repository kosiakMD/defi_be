import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from '../../common/common.module';

import { AssetsCategoryController } from '../../controllers/assets-category.controller';
import { AssetsCategoryService } from './assets-category.service';
import { AssetCategoryEntity } from './entities/asset-category.entity';
import { AssetsCategoryRepository } from './repositories/assets-category.repository';

@Module({
  imports: [
    HttpModule,
    CommonModule,
    TypeOrmModule.forFeature([AssetCategoryEntity, AssetsCategoryRepository]),
  ],
  controllers: [AssetsCategoryController],
  providers: [AssetsCategoryService],
  exports: [AssetsCategoryService],
})
export class AssetsCategoryModule {}
