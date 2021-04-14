import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseService } from './db/database.service';
import { JobsService } from './jobs.service';
import { PoolsModule } from '../pools/pools.module';
import { VaultsModule } from '../vaults/vaults.module';
import { SushiswapService } from './sushiswap.service';
import { CurveService } from './curve.service';
import { DatabaseManagerSushiswap } from './db/database.manager.sushiswap';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { UniswapService } from './uniswap.service';
import { PancakeService } from './pancake.service';
import { DatabaseManagerPancake } from './db/database.manager.pancake';
import { DatabaseManagerUniswap } from './db/database.manager.uniswap';
import { DatabaseTransactionManager } from './db/database.transaction.manager';

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
  exports: [DatabaseService]
})
export class JobsModule {}
