import { HttpModule } from '@nestjs/axios';
import { Inject, LoggerService, MiddlewareConsumer, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';
import { AllExceptionsFilter } from '@app/common/interceptors/AllExceptionsFilter';
import { SentryInterceptor } from '@app/common/interceptors/SentryInterceptor';
import { TransformHeadersInterceptor } from '@app/common/interceptors/TransformHeaderInterceptor';
import { LoggerMiddleware } from '@app/common/middlewares';
import { HeadersMiddleware } from '@app/common/middlewares/headers.middleware';

import config from './config';
import { HealthController } from './controllers/health.controller';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AssetsModule } from './modules/assets/assets.module';
import { BalancesModule } from './modules/balances/balances.module';
import { BlacklistModule } from './modules/blacklists/blacklist.module';
import { ChainsModule } from './modules/chains.module';
import { DatabaseModule } from './modules/database.module';
import { NftModule } from './modules/nft/nft.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { TransfersModule } from './modules/transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    // TODO implement more universal logic
    // createServiceWinstonAsyncModule('account', ConfigModule, new ConfigService()),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('account', configService),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT') || 60e3,
        maxRedirects: configService.get<number>('HTTP_MAX_REDIRECTS') || 2,
      }),
      inject: [ConfigService],
    }),
    TerminusModule,
    DatabaseModule,
    ChainsModule,
    // with controllers A-Z sort for Swagger API page
    ApprovalsModule,
    AssetsModule,
    BalancesModule,
    TransactionsModule,
    TransfersModule,
    AnalyticsModule,
    BlacklistModule,
    NftModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformHeadersInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
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
