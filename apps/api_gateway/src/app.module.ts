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

import configuration from '@app/common/config/configuration';
import { Environment, winstonParams } from '@app/common/utils/winston';

import { AccountModule } from './account/account.module';
import { AccountService } from './account/account.service';
import { AnalyticController } from './analytic/analytic.controller';
import { AppController } from './app/app.controller';
import { ServiceHealthIndicator } from './app/app.health';
import { AppService } from './app/app.service';
import { AssetsController } from './assets/assets.controller';
import { AssetsService } from './assets/assets.service';
import { BalancesController } from './balances/balances.controller';
import { Logger } from './common/Logger/Logger.service';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
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
        winstonParams({
          identifier: 'gateway',
          environment: configService.get<Environment>('NODE_ENV'),
          logErrorFile: configService.get<string>('LOG_ERROR_FILE'),
          logCombineLog: configService.get<string>('LOG_COMBINED_FILE'),
          serviceName: configService.get<string>('SERVICE_NAME'),
          level: configService.get<string>('LOG_LEVEL'),
          meta: { env: configService.get<string>('ENV') },
          awsConfig: {
            region: configService.get<string>('AWS_REGION'),
            accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: configService.get<string>('AWS_SECRET_ACCESS_KEY'),
          },
        }),
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
