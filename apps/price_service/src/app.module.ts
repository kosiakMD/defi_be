import { HttpModule } from '@nestjs/axios';
import { Inject, MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { Logger, LoggerModule } from '@app/common/Logger';
import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';
import { AllExceptionsFilter } from '@app/common/interceptors/AllExceptions.filter';
import { ResponceInterceptor } from '@app/common/interceptors/Responce.interceptor';
import { SentryInterceptor } from '@app/common/interceptors/Sentry.interceptor';
import { LoggerMiddleware } from '@app/common/middlewares';
import { HeadersMiddleware } from '@app/common/middlewares/Headers.middleware';

import config from './config';
import { HealthModule } from './modules/health.module';
import { LookupModule } from './modules/lookup/lookup.module';
import { PricesModule } from './modules/prices/prices.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => getWinstonParams('prices', configService),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        schema: configService.get<string>('DB_SCHEMA'),
        autoLoadEntities: true,
        logging: true,
      }),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT') || 60e3,
        maxRedirects: configService.get<number>('HTTP_MAX_REDIRECTS') || 2,
      }),
      inject: [ConfigService],
    }),
    PricesModule,
    HealthModule,
    LookupModule,
    LoggerModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponceInterceptor,
    },
  ],
})
export class AppModule implements OnModuleInit, NestModule {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HeadersMiddleware, LoggerMiddleware).forRoutes('/');
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
