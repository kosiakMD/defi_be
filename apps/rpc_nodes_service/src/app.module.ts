import * as redisStore from 'cache-manager-redis-store';

import { HttpTracingModule, TracingModule } from '@narando/nest-xray';
import {
  CacheModule,
  Inject,
  LoggerService,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import configuration from '@app/common/config/configuration';
import { AllExceptionsFilter } from '@app/common/interceptors/all-exceptions.filter';
import { SentryLogInterceptor } from '@app/common/interceptors/sentry-log.interceptor';
import { getWinstonParams } from '@app/common/logger/logger.config';
import { LogRequestMiddleware } from '@app/common/middlewares';
import { HeadersContextMiddleware } from '@app/common/middlewares/headers-context.middleware';

import config from './config';
import { EndpointsController } from './controllers/endpoints.controller';
import { HealthController } from './controllers/health.controller';
import { RPCNodesController } from './controllers/rpc-nodes.controller';
import { DatabaseModule } from './modules/database/database.module';
import { EndpointsModule } from './modules/endpoints/endpoints.module';
import { RPCNodesModule } from './modules/rpc_nodes/rpc-nodes.module';

@Module({
  imports: [
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
    ConfigModule.forRoot(configuration(config)),
    TracingModule.forRoot({ serviceName: 'rpc-nodes-service' }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('account', configService),
    }),
    HttpTracingModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT') || 60e3,
        maxRedirects: configService.get<number>('HTTP_MAX_REDIRECTS') || 2,
      }),
      inject: [ConfigService],
    }),
    TerminusModule,
    DatabaseModule,
    EndpointsModule,
    RPCNodesModule,
  ],
  controllers: [EndpointsController, RPCNodesController, HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryLogInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements OnModuleInit, NestModule {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HeadersContextMiddleware, LogRequestMiddleware).forRoutes('*');
  }

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
