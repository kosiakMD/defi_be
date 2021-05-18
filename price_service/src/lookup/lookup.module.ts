import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import * as redisStore from 'cache-manager-redis-store';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChainController } from './chain.controller';
import { CurrencyController } from './currency.controller';
import { Chain, Currency } from './models';
import { ChainService } from './services/chain.service';
import { CurrencyService } from './services/currency.service';

@Module({
  imports: [
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
    TypeOrmModule.forFeature([Chain, Currency]),
  ],
  controllers: [ChainController, CurrencyController],
  providers: [ChainService, CurrencyService],
  exports: [ChainService, CurrencyService],
})
export class LookupModule {}
