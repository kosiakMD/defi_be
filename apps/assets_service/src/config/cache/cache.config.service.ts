import * as redisStore from 'cache-manager-redis-store';

import { Injectable, CacheOptionsFactory, CacheModuleOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheConfigService implements CacheOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  public createCacheOptions(): CacheModuleOptions {
    return {
      store: redisStore,
      host: this.configService.get<string>('cache.host'),
      port: this.configService.get<number>('cache.port'),
      password: this.configService.get<string>('cache.password'),
      ttl: this.configService.get('cache.ttl'),
    };
  }
}
