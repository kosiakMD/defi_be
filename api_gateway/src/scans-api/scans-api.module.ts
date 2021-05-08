import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

import { BscScanService } from './modules/bscscan/bsc-scan.service';
import { EtherScanService } from './modules/etherscan/ether-scan.service';
import { ScansApiController } from './scans-api.controller';

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
  ],
  providers: [BscScanService, EtherScanService],
  exports: [BscScanService, EtherScanService],
  controllers: [ScansApiController],
})
export class ScansApiModule {}
