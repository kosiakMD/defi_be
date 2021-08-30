import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsController } from './assets.controller';
import { AssetsPoolsService } from './assets.pools.service';
import { AssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';
import { AssetsEntity } from './entity/assets.entity';
import { AssetsPoolsEntity } from './entity/assets.pools.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetsEntity, AssetsRepository, AssetsPoolsEntity])],
  controllers: [AssetsController],
  providers: [AssetsService, AssetsPoolsService],
  exports: [AssetsService],
})
export class AssetsModule {}
