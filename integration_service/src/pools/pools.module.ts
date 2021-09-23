import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LiquidityPoolsEntity } from './entities/liquidity.pools.entity';
import { PoolsService } from './pools.service';

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
    TypeOrmModule.forFeature([LiquidityPoolsEntity]),
  ],
  providers: [PoolsService],
  exports: [PoolsService],
})
export class PoolsModule {}
