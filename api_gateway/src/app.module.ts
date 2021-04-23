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
import { ApiVersionGuard } from '@nestjsx/api-version';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { AccountModule } from './account/account.module';
import { AccountService } from './account/account.service';
import { AppController } from './app/app.controller';
import { ServiceHealthIndicator } from './app/app.health';
import { AppService } from './app/app.service';
import { BalancerController } from './balancer/balancer.controller';
import { BalancesController } from './balances/balances.controller';
import { Logger } from './common/Logger/Logger.service';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import configuration from './config/configuration';
import { CurveController } from './curve/curve.controller';
import { GasModule } from './gas/gas.module';
import { HealthController } from './health/health.controller';
import { IntegrationService } from './integration/integration.service';
// import { PlatformController } from './platform/platform.controller';
import { PoolsModule } from './pools/pools.module';
import { PricesModule } from './prices/prices.module';
import { PricesService } from './prices/prices.service';
import { SushiswapController } from './sushiswap/sushiswap.controller';
import { SwapController } from './swap/swap.controller';
import { TokensModule } from './tokens/tokens.module';
// import { TransactionsController } from './transactions/transactions.controller';
import { TransfersController } from './transfers/transfers.controller';
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
    TerminusModule,
    HttpModule.register({
      timeout: 5e3,
      maxRedirects: 2,
    }),
    AccountModule,
    PoolsModule,
    VaultsModule,
    TokensModule,
    GasModule,
    PricesModule,
    ChainApiModule,
  ],
  controllers: [
    HealthController,
    AppController,
    BalancesController,
    SwapController,
    UniswapController,
    CurveController,
    SushiswapController,
    BalancerController,
    // PlatformController,
    // TransactionsController,
    TransfersController,
    ChainApiController
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
    // AccountService,
    EtherscanService,
    BscscanService,
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
