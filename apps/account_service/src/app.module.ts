import { HttpModule, Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import configuration from '@app/common/config/configuration';
import { Environment, winstonParams } from '@app/common/utils/winston';

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
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        winstonParams({
          identifier: 'account',
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
})
export class AppModule implements OnModuleInit {
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

  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}
}
