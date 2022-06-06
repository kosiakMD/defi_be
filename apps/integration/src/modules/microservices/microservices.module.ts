import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountService } from './account.service';
import { AssetsService } from './assets.service';
import { PriceService } from './price.service';
import { Puppeteer } from './puppeteer';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule,
    CacheModule.registerAsync({
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
  ],
  providers: [AssetsService, AccountService, PriceService, Puppeteer],
  exports: [AssetsService, AccountService, PriceService, Puppeteer],
})
export class MicroservicesModule {}
