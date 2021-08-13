import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { HttpModule, Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

import { AnalyticModule } from './analytic/analytic.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AssetsModule } from './assets/assets.module';
import { BalanceModule } from './balance/balance.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { ChainModule } from './chain/chain.module';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { TransactionsModule } from './transactions/transcations.module';
import { TransfersModule } from './transfers/transfers.module';
import { winstonParams } from './utils/winston';

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
    DatabaseModule,
    ChainModule,
    // with controllers A-Z sort for Swagger API page
    ApprovalsModule,
    AssetsModule,
    BalanceModule,
    TransactionsModule,
    TransfersModule,
    AnalyticModule,
    BlacklistModule,
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

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private configService: ConfigService,
  ) {}
}
