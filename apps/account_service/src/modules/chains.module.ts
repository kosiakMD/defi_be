import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, forwardRef, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Web3Provider } from '../common/providers/chainRelated/web3.provider';
import { PriceService } from '../common/providers/microservices/price/price.service';

import { AssetsModule } from './assets/assets.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature(),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        ttl: configService.get('REDIS_CACHE_TTL') || 30,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
    PriceService,
    forwardRef(() => AssetsModule),
  ],
  providers: [Web3Provider],
  exports: [Web3Provider],
})
export class ChainsModule {}
