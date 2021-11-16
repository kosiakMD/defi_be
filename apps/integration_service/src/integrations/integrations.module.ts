import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { FeaturesService } from '../protocol/features/features.service';
import { ProtocolModule } from '../protocol/protocol.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

// TODO to add a new Protocol just add it here and at ProtocolService constructor

@Module({
  imports: [
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
    ProtocolModule,
  ],
  providers: [IntegrationsService, FeaturesService],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
