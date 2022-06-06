import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AbiService } from './AbiService';
import { BlockScan } from './BlockScan.service';
import { BlockScout } from './BlockScout.service';
import { LocalFile } from './LocalFile.service';

// TODO to add a new Protocol just add it here and at ProtocolService constructor

@Module({
  imports: [
    HttpModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
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
    AbiService,
    BlockScan,
    BlockScout,
    LocalFile,
    MulticallAggregator,
    Web3ProviderService,
  ],
  exports: [AbiService],
})
export class AbiModule {}
