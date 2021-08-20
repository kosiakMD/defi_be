import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainController } from './chain.controller';
import { CurrencyController } from './currency.controller';
import { ChainDto, CurrencyDto } from './models';
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
    TypeOrmModule.forFeature([ChainDto, CurrencyDto]),
  ],
  controllers: [ChainController, CurrencyController],
  providers: [ChainService, CurrencyService],
  exports: [ChainService, CurrencyService],
})
export class LookupModule {}
