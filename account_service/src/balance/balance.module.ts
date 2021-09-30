import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AssetsModule } from '../assets/assets.module';
import { AssetsEntity } from '../assets/entity/assets.entity';
import { BlacklistModule } from '../blacklist/blacklist.module';
import { ChainModule } from '../chain/chain.module';
import { CovalentModule } from '../covalent/covalent.module';
import { CovalentService } from '../covalent/covalent.service';
import { PriceModule } from '../price/price.module';
import { BalanceController } from './balance.controller';
import { BalancesService } from './balances.service';
import { CovalentBalancesStrategy } from './strategy/covalent/covalent.strategy';
import { NetworkBalancesStrategy } from './strategy/network/network.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetsEntity]),
    HttpModule,
    ChainModule,
    PriceModule,
    AssetsModule,
    CovalentModule,
    BlacklistModule,
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
  providers: [BalancesService, CovalentService, CovalentBalancesStrategy, NetworkBalancesStrategy],
})
export class BalanceModule {}
