import { HttpModule } from '@nestjs/axios';
import {
  CacheModule,
  Inject,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ApiVersionGuard } from '@nestjsx/api-version';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { Logger, LogRequestMiddleware } from '@app/common';
import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';
import { AllExceptionsFilter } from '@app/common/interceptors/all-exceptions.filter';
import { ResponseInterceptor } from '@app/common/interceptors/response-interceptor.service';
import { SentryInterceptor } from '@app/common/interceptors/sentry.interceptor';
import { HeadersContextMiddleware } from '@app/common/middlewares/HeadersContext.middleware';
import { Web3NameService } from '@app/common/web3provider/web3.name.service';

import { AnalyticController } from './analytic/analytic.controller';
import { AssetsController } from './assets/assets.controller';
import { BalancesController } from './balances/balances.controller';
import config from './config';
import { GasModule } from './gas/gas.module';
import { HealthController } from './health/health.controller';
import { ServiceHealthIndicator } from './health/health.service';
import { ImpermanentLossModule } from './impermanent-loss/impermanent-loss.module';
import { MailModule } from './mail/mail.module';
import { NetworksController } from './networks/networks.controller.dto';
import { NftController } from './nft/nft.controller';
import { PartnersController } from './partners/partners.controller';
import { PoolsModule } from './pools/pools.module';
import { PricesModule } from './prices/prices.module';
import { ProjectsController } from './projects/projects.controller';
import { ProtocolController } from './protocol/protocol.controller';
import { ProtocolControllerV2 } from './protocol/protocol.controller.v2';
import { ScamsController } from './scams/scams.controller.dto';
import { ScansApiModule } from './scans-api/scans-api.module';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';
import { TokensController } from './tokens/tokens.controller';
import { TransactionsController } from './transactions/transactions.controller';
import { VaultsModule } from './vaults/vaults.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get('REDIS_GATEWAY_CACHE_TTL') || 900,
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forRoot(configuration(config)),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('gateway', configService),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT') || 300e3,
        maxRedirects: configService.get<number>('HTTP_MAX_REDIRECTS') || 2,
      }),
      inject: [ConfigService],
    }),
    TerminusModule,
    PoolsModule,
    VaultsModule,
    GasModule,
    PricesModule,
    ScansApiModule,
    MailModule,
    ImpermanentLossModule,
  ],
  controllers: [
    HealthController,
    AnalyticController,
    AssetsController,
    BalancesController,
    TransactionsController,
    ProtocolController,
    NftController,
    ProtocolControllerV2,
    SearchController,
    NetworksController,
    PartnersController,
    ProjectsController,
    ScamsController,
    TokensController,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ApiVersionGuard,
    },
    ServiceHealthIndicator,
    // TODO: for global auto caching
    // {
    // 	provide: APP_INTERCEPTOR,
    // 	useClass: CacheInterceptor,
    // },
    ServiceHealthIndicator,
    SearchService,
    Web3NameService,
  ],
})
export class AppModule implements OnModuleInit, NestModule {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

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
