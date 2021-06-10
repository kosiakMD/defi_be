import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsController } from './assets.controller';
import { AssetsEntity } from './assets.entity';
import { AssetsService } from './assets.service';

@Module({
  imports: [TypeOrmModule.forFeature([AssetsEntity])],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
