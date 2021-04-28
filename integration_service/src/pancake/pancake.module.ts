import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { Mapper } from '../mappers/mapper';
import { PriceModule } from '../price/price.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { PancakeBurnsEntity } from './entity/pancake.burns.entity';
import { PancakeMintsEntity } from './entity/pancake.mints.entity';
import { PancakeSnapshotsEntity } from './entity/pancake.snapshots.entity';
import { PancakeSwapsEntity } from './entity/pancake.swaps.entity';
import { PancakeController } from './pancake.controller';
import { PancakeService } from './pancake.service';
import { AccountModule } from '../account/account.module';
import { PoolsModule } from '../pools/pools.module';
import { EtherscanModule } from '../etherscan/etherscan.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PancakeBurnsEntity,
      PancakeMintsEntity,
      PancakeSwapsEntity,
      PancakeSnapshotsEntity,
    ]),
    ThegraphModule,
    ChainModule,
    PriceModule,
    AccountModule,
    PoolsModule,
    EtherscanModule,
  ],
  controllers: [PancakeController],
  providers: [PancakeService, Mapper],
})
export class PancakeModule {}
