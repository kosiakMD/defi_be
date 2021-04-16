import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Mapper } from '../mappers/mapper';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { SushiswapBurnsEntity } from './entity/sushiswap.burns.entity';
import { SushiswapMintsEntity } from './entity/sushiswap.mints.entity';
import { SushiswapSnapshotsEntity } from './entity/sushiswap.snapshots.entity';
import { SushiswapSwapsEntity } from './entity/sushiswap.swaps.entity';
import { SushiswapController } from './sushiswap.controller';
import { SushiswapService } from './sushiswap.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SushiswapSnapshotsEntity,
      SushiswapBurnsEntity,
      SushiswapMintsEntity,
      SushiswapSwapsEntity,
    ]),
    ThegraphModule,
  ],
  controllers: [SushiswapController],
  providers: [SushiswapService, Mapper],
})
export class SushiswapModule {}
