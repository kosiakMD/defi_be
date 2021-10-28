import { PriceService } from 'apps/account_service/src/price/price.service';
import { ThegraphModule } from 'apps/account_service/src/thegraph/thegraph.module';
import * as redisStore from 'cache-manager-redis-store';

import { Module, HttpModule, CacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AavegotchiService } from './aavegotchi.service';

@Module({
  imports: [
    HttpModule,
    ThegraphModule,
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
  providers: [AavegotchiService, PriceService],
  exports: [AavegotchiService],
})
export class AavegotchiModule {}
