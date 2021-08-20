import { ApiVersionGuard } from '@nestjsx/api-version';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import {
  HttpModule,
  Inject,
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';

import { AccountModule } from './account/account.module';
import { AccountService } from './account/account.service';
import { AnalyticController } from './analytic/analytic.controller';
import { AppController } from './app/app.controller';
import { ServiceHealthIndicator } from './app/app.health';
import { AppService } from './app/app.service';
import { AssetsController } from './assets/assets.controller';
import { AssetsService } from './assets/assets.service';
import { BalancerController } from './balancer/balancer.controller';
import { BalancesController } from './balances/balances.controller';
import { Logger } from './common/Logger/Logger.service';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import configuration from './config/configuration';
import { CurveController } from './curve/curve.controller';
import { GasModule } from './gas/gas.module';
import { HealthController } from './health/health.controller';
import { ImpermanentLossModule } from './impermanent-loss/impermanent-loss.module';
import { IntegrationService } from './integration/integration.service';
import { MailModule } from './mail/mail.module';
import { PancakeController } from './pancake/pancake.controller';
import { PoolsModule } from './pools/pools.module';
import { PricesModule } from './prices/prices.module';
import { PricesService } from './prices/prices.service';
import { SafeProxyModule } from './safe-proxy/safe.proxy.module';
import { SafeProxyService } from './safe-proxy/safe.proxy.service';
// import { ScansApiController } from './scans-api/scans-api.controller';
import { ScansApiModule } from './scans-api/scans-api.module';
import { SushiswapController } from './sushiswap/sushiswap.controller';
import { SwapController } from './swap/swap.controller';
import { TokensModule } from './tokens/tokens.module';
import { TransactionsController } from './transactions/transactions.controller';
import { TransfersController } from './transfers/transfers.controller';
import { TransfersService } from './transfers/transfers.service';
import { UniswapController } from './uniswap/uniswap.controller';
import { filterObjectKeys } from './utils/object';
import { isAllUppercase } from './utils/string';
import { winstonParams } from './utils/winston';
import { VaultsModule } from './vaults/vaults.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        winstonParams(
          configService.get<string>('LOG_ERROR_FILE'),
          configService.get<string>('LOG_COMBINED_FILE'),
          configService.get<string>('SERVICE_NAME'),
          configService.get<string>('LOG_LEVEL'),
          { env: configService.get<string>('ENV') },
        ),
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
    CurveController,
    BalancesController,
    TransactionsController,
    TransfersController,
    // Platforms
    BalancerController,
    PancakeController,
    SushiswapController,
    UniswapController,
    SwapController,
    // PlatformController,
    // ScansApiController,
  ],
  providers: [
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
    consumer.apply(LoggerMiddleware).forRoutes('/');
  }

  onModuleInit(): void {
    const { ENV, SERVICE_NAME, SERVICE_PORT, SERVICE_HOST } = process.env;
    this.logger.log(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      filterObjectKeys(this.configService.internalConfig._PROCESS_ENV_VALIDATED, isAllUppercase),
      SERVICE_NAME,
    );
    this.logger.log(
      {
        env: ENV,
        host: SERVICE_HOST,
        port: SERVICE_PORT,
      },
      'App',
    );
  }

  constructor(
    // TODO: left for custom logger
    // private readonly logger: Logger,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private configService: ConfigService,
  ) {}
}
