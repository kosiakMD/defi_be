import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as redisStore from 'cache-manager-redis-store';

import { ChainModule } from '../chain/chain.module';
import { MulticallModule } from '../multicall/multicall.module';
import { PriceModule } from '../price/price.module';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { EtherscanApi } from './bcs_etherscan/etherscan.api';
import { EtherscanService } from './bcs_etherscan/etherscan.service';
import { DbService } from './repository/db.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule,
    ChainModule,
    PriceModule,
    MulticallModule,
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
  providers: [BalanceService, DbService, EtherscanService, EtherscanApi],
})
export class BalanceModule {}
