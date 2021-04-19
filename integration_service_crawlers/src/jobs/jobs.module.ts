import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PoolsModule } from '../pools/pools.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { VaultsModule } from '../vaults/vaults.module';
import { CurveService } from './curve.service';
import { DatabaseManagerPancake } from './db/database.manager.pancake';
import { DatabaseManagerSushiswap } from './db/database.manager.sushiswap';
import { DatabaseManagerUniswap } from './db/database.manager.uniswap';
import { DatabaseService } from './db/database.service';
import { DatabaseTransactionManager } from './db/database.transaction.manager';
import { JobsService } from './jobs.service';
import { PancakeService } from './pancake.service';
import { SushiswapService } from './sushiswap.service';
import { UniswapService } from './uniswap.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ThegraphModule,
    forwardRef(() => PoolsModule),
    forwardRef(() => VaultsModule),
  ],
  providers: [
    UniswapService,
    SushiswapService,
    PancakeService,
    CurveService,
    DatabaseService,
    JobsService,
    DatabaseManagerSushiswap,
    DatabaseManagerUniswap,
    DatabaseManagerPancake,
    DatabaseTransactionManager,
  ],
  exports: [DatabaseService],
})
export class JobsModule {}
