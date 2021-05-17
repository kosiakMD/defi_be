import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '../database/database.module';
import { LiquidityPoolsEntity } from './entities/liquiditypools.entity';
import { LiquidityPoolsStore } from './liquiditypools.store';
import { LiquidityPoolsRepository } from './repositories/liquiditypools.repository';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([LiquidityPoolsEntity])],
  providers: [LiquidityPoolsStore, LiquidityPoolsEntity, LiquidityPoolsRepository],
  exports: [LiquidityPoolsStore, LiquidityPoolsEntity, LiquidityPoolsRepository],
})
export class StoreModule {}
