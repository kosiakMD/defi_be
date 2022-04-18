import { HttpTracingModule, TracingModule } from '@narando/nest-xray';
import { Inject, LoggerService, MiddlewareConsumer, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';
import { SentryInterceptor } from '@app/common/interceptors/sentry.interceptor';
import { LogRequestMiddleware } from '@app/common/middlewares';
import { HeadersContextMiddleware } from '@app/common/middlewares/HeadersContext.middleware';

import config from './config';
import { HealthController } from './controllers/health.controller';
import { OpportunitiesController } from './controllers/opportunities.controller';
import { DatabaseModule } from './modules/database/database.module';
import { OpportunityModule } from './modules/opportunity/opportunity.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    TracingModule.forRoot({ serviceName: 'opportunities-service' }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('account', configService),
    }),
    HttpTracingModule.registerAsync({
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
  controllers: [OpportunitiesController, HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
    // TODO: testing 1 Sentry middleware only, without interceptors
    // {
    //   provide: APP_FILTER,
    //   useClass: AllExceptionsFilter,
    // },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HeadersContextMiddleware, LogRequestMiddleware).forRoutes('*');
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
