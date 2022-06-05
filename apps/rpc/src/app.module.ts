import * as redisStore from 'cache-manager-redis-store';

import { CacheModule, Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';

import config from './config';
import { EndpointsController } from './controllers/endpoints.controller';
import { HealthController } from './controllers/health.controller';
import { RPCNodesController } from './controllers/rpc-nodes.controller';
import { DatabaseModule } from './modules/database/database.module';
import { EndpointsModule } from './modules/endpoints/endpoints.module';
import { RpcModule } from './modules/rpc/rpc.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        ttl: configService.get('REDIS_CACHE_TTL') || 30,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        password: configService.get('REDIS_AUTH'),
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('account', configService),
    }),
    TerminusModule,
    DatabaseModule,
    EndpointsModule,
    RpcModule,
  ],
  controllers: [EndpointsController, RPCNodesController, HealthController],
})
export class AppModule implements OnModuleInit {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  // NOTE: We should not log RPC requests / responses as they could be large

  onModuleInit(): void {
    const { ENV, SERVICE_NAME, SERVICE_PORT, SERVICE_HOST } = process.env;
    this.logger.log(
      {
        env: ENV,
        name: SERVICE_NAME,
        host: SERVICE_HOST,
        port: SERVICE_PORT,
      },
      'App',
    );
  }
}
