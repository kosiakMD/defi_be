import { forwardRef, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApisModule } from '../apis/apis.module';
import { ChainModule } from '../chain/chain.module';
import { JobsModule } from '../jobs/jobs.module';
import { StoreModule } from '../store/store.module';
import { ThegraphModule } from '../thegraph/thegraph.module';
import { PoolsService } from './pools.service';
import { PoolsServiceBalancer } from './pools.service.balancer';
import { PoolsServiceCurve } from './pools.service.curve';
import { PoolsServicePancake } from './pools.service.pancake';
import { PoolsServiceSushiswap } from './pools.service.sushiswap';
import { PoolsServiceUniswap } from './pools.service.uniswap';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    forwardRef(() => JobsModule),
    ConfigModule,
    ThegraphModule,
    ApisModule,
    ChainModule,
    StoreModule,
  ],
  providers: [
    PoolsService,
    PoolsServiceUniswap,
    PoolsServiceSushiswap,
    PoolsServiceBalancer,
    PoolsServiceCurve,
    PoolsServicePancake,
  ],
  exports: [PoolsService],
})
export class PoolsModule {}
