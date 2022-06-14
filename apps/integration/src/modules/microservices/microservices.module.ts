import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CardanoService } from '../protocols/helpers/cardano/cardano.service';
import { MuesliSwapAccountService } from './MuesliSwapAccountService';
import { MuesliSwapPriceService } from './MuesliSwapPriceService';
import { AccountService } from './account.service';
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
  providers: [
    // Account Services
    AccountService,
    MuesliSwapAccountService,
    // Price Services
    PriceService,
    MuesliSwapPriceService,
    Puppeteer,
    CardanoService,
  ],
  exports: [
    AccountService,
    MuesliSwapAccountService,
    PriceService,
    MuesliSwapPriceService,
    Puppeteer,
    CardanoService,
  ],
})
export class MicroservicesModule {}
