import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PriceModule } from '../price/price.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { UniswapBurnsEntity } from './entities/uniswap.burns.entity';
import { UniswapMintsEntity } from './entities/uniswap.mints.entity';
import { UniswapSnapshotsEntity } from './entities/uniswap.snapshots.entity';
import { UniswapSwapsEntity } from './entities/uniswap.swaps.entity';
import { UniswapController } from './uniswap.controller';
import { UniswapService } from './uniswap.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UniswapMintsEntity,
      UniswapSwapsEntity,
      UniswapBurnsEntity,
      UniswapSnapshotsEntity,
    ]),
    ThegraphModule,
    ChainModule,
    PriceModule,
  ],
  controllers: [UniswapController],
  providers: [UniswapService, Mapper],
})
export class UniswapModule {}
