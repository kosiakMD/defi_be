import { HttpTracingModule, TracingModule } from '@narando/nest-xray';
import {
  Inject,
  LoggerService,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';
import { ResponseInterceptor } from '@app/common/interceptors/Response.interceptor';
import { SentryInterceptor } from '@app/common/interceptors/Sentry.interceptor';
import { LogRequestMiddleware } from '@app/common/middlewares';
import { HeadersContextMiddleware } from '@app/common/middlewares/HeadersContext.middleware';

import config from './config';
import { HealthController } from './controllers/health.controller';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AssetsModule } from './modules/assets/assets.module';
import { BalancesModule } from './modules/balances/balances.module';
import { BlacklistModule } from './modules/blacklists/blacklist.module';
import { ChainsModule } from './modules/chains/chains.module';
import { DatabaseModule } from './modules/database.module';
import { NftModule } from './modules/nft/nft.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { TransfersModule } from './modules/transfers/transfers.module';

// controllers A-Z sort for Swagger API page
const controllers = [
  AnalyticsModule,
  ApprovalsModule,
  AssetsModule,
  BalancesModule,
  BlacklistModule,
  ChainsModule,
  NftModule,
  TransactionsModule,
  TransfersModule,
];

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    TracingModule.forRoot({ serviceName: 'account-service' }),
    // TODO implement more universal logic
    // createServiceWinstonAsyncModule('account', ConfigModule, new ConfigService()),
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
    // with controllers A-Z sort for Swagger API page
    ...controllers,
  ],
  controllers: [HealthController],
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
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
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
