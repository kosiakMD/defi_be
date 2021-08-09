import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { CovalentModule } from '../covalent/covalent.module';
import { CovalentService } from '../covalent/covalent.service';
import { MulticallModule } from '../multicall/multicall.module';
import { PriceModule } from '../price/price.module';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { DbService } from './repository/db.service';
import { ScanApi } from './scan/scan.api';
import { ScanService } from './scan/scan.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule,
    ChainModule,
    PriceModule,
    MulticallModule,
    CovalentModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('REDIS_CACHE_TTL') || 30,
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BalanceController],
  providers: [BalanceService, DbService, ScanService, ScanApi, CovalentService],
})
export class BalanceModule {}
