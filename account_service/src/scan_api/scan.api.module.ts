import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PriceModule } from '../price/price.module';
import { BscScanService } from './bsc-scan.service';
import { EtherScanService } from './ether-scan.service';
import { PolygonScanService } from './polygon-scan.service';

@Module({
  imports: [
    HttpModule,
    // ConfigModule,
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
  providers: [BscScanService, EtherScanService, PolygonScanService],
  exports: [BscScanService, EtherScanService, PolygonScanService],
})
export class ScanApiModule {}
