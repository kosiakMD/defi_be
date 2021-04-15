import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LiquidityPoolsEntity } from './entities/liquidity.pools.entity';
import { PoolsController } from './pools.controller';
import { PoolsService } from './pools.service';
import { LiquidityPoolsRepository } from './repository/liquidity.pools.repository';

@Module({
  controllers: [PoolsController],
  imports: [TypeOrmModule.forFeature([LiquidityPoolsEntity])],
  providers: [PoolsService, LiquidityPoolsRepository],
})
export class PoolsModule {}
