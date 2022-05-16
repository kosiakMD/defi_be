import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsCategoryController } from '../../controllers/assets-category.controller';
import { AssetsCategoryService } from './assets-category.service';
import { AssetCategoryEntity } from './entities/asset-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetCategoryEntity])],
  controllers: [AssetsCategoryController],
  providers: [AssetsCategoryService],
})
export class AssetsCategoryModule {}
