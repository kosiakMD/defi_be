import { HttpModule } from '@nestjs/axios';
import { Inject, MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ApiVersionGuard } from '@nestjsx/api-version';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { LoggerMiddleware } from '@app/common';
import { Logger } from '@app/common';
import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';
import { AllExceptionsFilter } from '@app/common/interceptors/AllExceptionsFilter';
import { HeadersMiddleware } from '@app/common/middlewares/headers.middleware';

import { AccountModule } from './account/account.module';
import { AccountService } from './account/account.service';
import { AnalyticController } from './analytic/analytic.controller';
import { AppController } from './app/app.controller';
import { ServiceHealthIndicator } from './app/app.health';
import { AppService } from './app/app.service';
import { AssetsController } from './assets/assets.controller';
import { AssetsService } from './assets/assets.service';
import { BalancesController } from './balances/balances.controller';
import config from './config';
import { GasModule } from './gas/gas.module';
import { HealthController } from './health/health.controller';
import { ImpermanentLossModule } from './impermanent-loss/impermanent-loss.module';
import { IntegrationService } from './integration/integration.service';
import { MailModule } from './mail/mail.module';
import { NftController } from './nft/nft.controller';
import { PancakeController } from './pancake/pancake.controller';
import { PangolinController } from './pangolin/pangolin.controller';
import { PoolsModule } from './pools/pools.module';
import { PricesModule } from './prices/prices.module';
import { PricesService } from './prices/prices.service';
import { ProtocolController } from './protocol/protocol.controller';
import { ProtocolControllerV2 } from './protocol/protocol.controller.v2';
import { SafeProxyModule } from './safe-proxy/safe.proxy.module';
import { SafeProxyService } from './safe-proxy/safe.proxy.service';
import { ScansApiModule } from './scans-api/scans-api.module';
import { SpookyswapController } from './spookyswap/spookyswap.controller';
import { SushiswapController } from './sushiswap/sushiswap.controller';
import { SwapController } from './swap/swap.controller';
import { TokensModule } from './tokens/tokens.module';
import { TransactionsController } from './transactions/transactions.controller';
import { TransfersController } from './transfers/transfers.controller';
import { TransfersService } from './transfers/transfers.service';
import { UniswapController } from './uniswap/uniswap.controller';
import { VaultsModule } from './vaults/vaults.module';

@Module({
  imports: [
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
    AccountModule,
    PoolsModule,
    VaultsModule,
    TokensModule,
    GasModule,
    PricesModule,
    ScansApiModule,
    MailModule,
    ImpermanentLossModule,
    SafeProxyModule,
  ],
  controllers: [
    HealthController,
    AnalyticController,
    AppController,
    AssetsController,
    BalancesController,
    TransactionsController,
    TransfersController,
    // Platforms
    PancakeController,
    PangolinController,
    SushiswapController,
    SpookyswapController,
    UniswapController,
    SwapController,
    ProtocolController,
    NftController,
    ProtocolControllerV2,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TransformHeadersInterceptor,
    // },
    // TODO: for global auto caching
    // {
    // 	provide: APP_INTERCEPTOR,
    // 	useClass: CacheInterceptor,
    // },
    {
      provide: APP_GUARD,
      useClass: ApiVersionGuard,
    },
    // TODO: left for custom logger
    // {
    // 	provide: WINSTON_MODULE_NEST_PROVIDER,
    // 	useClass: Logger,
    // },
    // {
    // 	provide: 'Logger',
    // 	useClass: Logger,
    // },
    ServiceHealthIndicator,
    AppService,
    AccountService,
    IntegrationService,
    PricesService,
    TransfersService,
    AccountService,
    AssetsService,
    SafeProxyService,
  ],
})
export class AppModule implements OnModuleInit, NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HeadersMiddleware, LoggerMiddleware).forRoutes('/');
  }

  onModuleInit(): void {
    const { ENV, SERVICE_PORT, SERVICE_HOST } = process.env;
    this.logger.log(
      {
        env: ENV,
        host: SERVICE_HOST,
        port: SERVICE_PORT,
      },
      'App',
    );
  }

  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}
}
