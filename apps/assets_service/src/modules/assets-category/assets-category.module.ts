import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsCategoryController } from '../../controllers/assets-category.controller';
import { AssetsCategoryService } from './assets-category.service';
import { AssetsCategoryEntity } from './entities/assets-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetsCategoryEntity])],
  controllers: [AssetsCategoryController],
  providers: [AssetsCategoryService],
})
export class AssetsCategoryModule {}
