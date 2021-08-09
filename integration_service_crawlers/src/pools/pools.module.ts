import { CacheModule, forwardRef, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

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
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('REDIS_CACHE_TTL') || 300,
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
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
