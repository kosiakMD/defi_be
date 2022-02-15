import { HttpModule } from '@nestjs/axios';
import { Inject, LoggerService, MiddlewareConsumer, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';
import { AllExceptionsFilter } from '@app/common/interceptors/AllExceptions.filter';
import { LoggerMiddleware } from '@app/common/middlewares';
import { HeadersMiddleware } from '@app/common/middlewares/Headers.middleware';

import config from './config';
import { OpportunitiesController } from './controllers/opportunities.controller';
import { DatabaseModule } from './modules/database/database.module';
import { OpportunityModule } from './modules/opportunity/opportunity.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('account', configService),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get('http.timeout'),
        maxRedirects: configService.get('http.maxRedirects'),
      }),
      inject: [ConfigService],
    }),
    TerminusModule,
    DatabaseModule,
    OpportunityModule,
  ],
  controllers: [OpportunitiesController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HeadersMiddleware, LoggerMiddleware).forRoutes('/');
  }

  onModuleInit(): void {
    const { SERVICE_NAME, SERVICE_HOST, SERVICE_PORT } = process.env;
    this.logger.log(
      {
        name: SERVICE_NAME,
        host: SERVICE_HOST,
        port: SERVICE_PORT,
      },
      'App',
    );
  }
}
