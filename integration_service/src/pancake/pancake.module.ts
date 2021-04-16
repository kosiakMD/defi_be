import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Mapper } from '../mappers/mapper';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { PancakeBurnsEntity } from './entity/pancake.burns.entity';
import { PancakeMintsEntity } from './entity/pancake.mints.entity';
import { PancakeSnapshotsEntity } from './entity/pancake.snapshots.entity';
import { PancakeSwapsEntity } from './entity/pancake.swaps.entity';
import { PancakeController } from './pancake.controller';
import { PancakeService } from './pancake.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PancakeBurnsEntity,
      PancakeMintsEntity,
      PancakeSwapsEntity,
      PancakeSnapshotsEntity,
    ]),
    ThegraphModule,
  ],
  controllers: [PancakeController],
  providers: [PancakeService, Mapper],
})
export class PancakeModule {}
