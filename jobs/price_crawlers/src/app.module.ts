import { AgendaModule } from 'nestjs-agenda';
import { NestPgpromiseModule } from 'nestjs-pgpromise';
import * as winston from 'winston';

import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import {
  utilities as nestWinstonModuleUtilities,
  WINSTON_MODULE_NEST_PROVIDER,
  WinstonModule,
} from 'nest-winston';

import { Logger, LoggerModule } from '@app/common';
import configuration from '@app/common/config/configuration';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from './config';
import { HealthController } from './health/health.controller';
import { CoingeckoJob } from './jobs/coingecko.job';
import { CommonJob } from './jobs/common.job';
import { PancakeJob } from './jobs/pancake.job';
import { SushiswapJob } from './jobs/sushiswap.job';
import { UniswapJob } from './jobs/uniswap.job';
import { DatabaseService } from './services/database.service';
import { JobsService } from './services/jobs.service';
import { Api } from './thegraph/api';

@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot(configuration(config)),
    WinstonModule.forRoot({
      // options
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.json(),
      defaultMeta: { service: process.env.SERVICE_NAME },
      transports: [
        new winston.transports.Console({
          format:
            Boolean(process.env.LOG_IN_JSON) && process.env.LOG_IN_JSON.toLowerCase() === 'true'
              ? winston.format.json()
              : // NestJS console like logs
                winston.format.combine(
                  winston.format.timestamp(),
                  nestWinstonModuleUtilities.format.nestLike(),
                ),
        }),
        // - Write all logs with level `error` and below to `error.log`
        new winston.transports.File({ filename: process.env.LOG_ERROR_FILE, level: 'error' }),
        // - Write all logs with level `info` and below to `combined.log`
        new winston.transports.File({ filename: process.env.LOG_COMBINED_FILE }),
      ],
    }),

    TerminusModule,
    NestPgpromiseModule.register({
      connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_DATABASE,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
      },
    }),
    AgendaModule.register({
      db: {
        address:
          'mongodb://' +
          process.env.MONGO_USER +
          ':' +
          process.env.MONGO_PASS +
          '@' +
          process.env.MONGO_HOST +
          ':' +
          process.env.MONGO_PORT +
          '/agenda?authMechanism=DEFAULT&authSource=admin',
      },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [
    ConfigService,
    Api,
    AppService,
    JobsService,
    DatabaseService,
    CoingeckoJob,
    SushiswapJob,
    PancakeJob,
    UniswapJob,
    CommonJob,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private configService: ConfigService,
  ) {}

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
