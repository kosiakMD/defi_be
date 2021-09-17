import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PriceModule } from '../price/price.module';
import { AssetService } from './asset.service';
import { WETH } from './contracts/WETH';
import { Web3Provider } from './web3.provider';

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
    PriceModule,
  ],
  providers: [Web3Provider, WETH, AssetService],
  exports: [Web3Provider, WETH, AssetService],
})
export class ChainModule {}
