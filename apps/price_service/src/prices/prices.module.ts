import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LookupModule } from '../lookup/lookup.module';
import { Asset, AssetCurrentPrice, AssetPrice } from './models';
import { PricesController } from './prices.controller';
import { PriceService } from './prices.service';

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
    TypeOrmModule.forFeature([AssetPrice, Asset, AssetCurrentPrice]),
    LookupModule,
  ],
  controllers: [PricesController],
  providers: [PriceService],
  exports: [TypeOrmModule],
})
export class PricesModule {}
