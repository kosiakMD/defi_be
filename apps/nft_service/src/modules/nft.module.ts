import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { NftFetchPriceRequestProviderMock } from './nft.fetch.price.request.provider.mock';
import { NftService } from './nft.service';
import { NftPricesModule } from './prices/nft.prices.module';

@Module({
  imports: [
    HttpModule,
    NftPricesModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        ttl: configService.get('REDIS_CACHE_TTL'),
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [NftService, NftFetchPriceRequestProviderMock],
  exports: [NftService],
})
export class NftModule {}
