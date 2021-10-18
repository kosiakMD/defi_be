import * as redisStore from 'cache-manager-redis-store';

import { CacheModule } from '@nestjs/common';
import { Module, HttpModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { OpenSeaService } from '../open_sea/open.sea.service';
import { PriceService } from '../price/price.service';
import { NftController } from './nft.controller';
import { NftService } from './nft.service';

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
  providers: [NftService, OpenSeaService, PriceService],
  controllers: [NftController],
})
export class NftModule {}
