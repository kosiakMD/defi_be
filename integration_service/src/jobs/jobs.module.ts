import { CacheModule, Module } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
    controllers: [JobsController],
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
      ],
    providers: [JobsService],
})
export class JobsModule {}
