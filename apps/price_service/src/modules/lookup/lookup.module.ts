import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, forwardRef, HttpModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainController } from '../../controllers/chain.controller';
import { CurrencyController } from '../../controllers/currency.controller';
import { PricesModule } from '../prices/prices.module';
import { ChainService } from './chain.service';
import { CurrencyService } from './currency.service';
import { ChainEntity } from './entities/chain.entity';
import { CurrencyEntity } from './entities/currency.entity';

@Module({
  imports: [
    forwardRef(() => PricesModule),
    HttpModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        ttl: configService.get('REDIS_CACHE_TTL') || 300,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        // eslint-disable-next-line camelcase
        auth_pass: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([ChainEntity, CurrencyEntity]),
  ],
  controllers: [ChainController, CurrencyController],
  providers: [ChainService, CurrencyService],
  exports: [ChainService, CurrencyService],
})
export class LookupModule {}
