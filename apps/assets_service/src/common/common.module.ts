import * as redisStore from 'cache-manager-redis-store';

import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { WinstonModule } from 'nest-winston';

import { getWinstonParams } from '@app/common/logger/logger.config';
import { CacheService } from '@app/common/services/cache.service';
import { Web3ProviderService } from '@app/common/web3provider';

import { HealthController } from '../controllers/health.controller';
import { ChainService } from './services/chain.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_AUTH'),
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('cache.host'),
        port: configService.get<number>('cache.port'),
        password: configService.get<string>('cache.password'),
        ttl: configService.get<number>('cache.ttl'),
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => getWinstonParams('assets', configService),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('http.timeout'),
        maxRedirects: configService.get<number>('http.maxRedirects'),
      }),
      inject: [ConfigService],
    }),
    TerminusModule,
  ],
  controllers: [HealthController],
  providers: [CacheService, ChainService, Web3ProviderService],
  exports: [CacheService, ChainService, Web3ProviderService],
})
export class CommonModule {}
