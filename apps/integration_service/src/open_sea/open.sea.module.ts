import * as redisStore from 'cache-manager-redis-store';

import { Module, HttpModule, CacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PriceService } from '../price/price.service';
import { OpenSeaService } from './open.sea.service';

@Module({
  imports: [
    HttpModule,
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
  ],
  providers: [OpenSeaService, PriceService],
  exports: [OpenSeaService],
})
export class OpenSeaModule {}
