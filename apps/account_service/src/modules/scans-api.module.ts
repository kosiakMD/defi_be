import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { BscScanService } from '../common/providers/chain-related/scans/bsc-scan.service';
import { EtherScanService } from '../common/providers/chain-related/scans/ether-scan.service';
import { PolygonScanService } from '../common/providers/chain-related/scans/polygon-scan.service';
import { PriceService } from '../common/providers/microservices/price/price.service';

import { ChainsModule } from './chains/chains.module';

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
    ChainsModule,
  ],
  providers: [PriceService, BscScanService, EtherScanService, PolygonScanService],
  exports: [BscScanService, EtherScanService, PolygonScanService],
})
export class ScansApiModule {}
