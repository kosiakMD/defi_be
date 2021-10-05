import * as redisStore from 'cache-manager-redis-store';

import { HttpModule, Module, CacheModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountService } from './account.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(),
    HttpModule,
    CacheModule.registerAsync({
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
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
