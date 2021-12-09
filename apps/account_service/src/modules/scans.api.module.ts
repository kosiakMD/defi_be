import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { BscScanService } from '../common/providers/chainRelated/scans/bsc-scan.service';
import { EtherScanService } from '../common/providers/chainRelated/scans/ether-scan.service';
import { PolygonScanService } from '../common/providers/chainRelated/scans/polygon-scan.service';
import { PriceService } from '../common/providers/microservices/price/price.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
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
  providers: [PriceService, BscScanService, EtherScanService, PolygonScanService],
  exports: [BscScanService, EtherScanService, PolygonScanService],
})
export class ScansApiModule {}
