import { Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  utilities as nestWinstonModuleUtilities,
  WINSTON_MODULE_NEST_PROVIDER,
  WinstonModule,
} from 'nest-winston';
import { AgendaModule } from 'nestjs-agenda';
import { NestPgpromiseModule } from 'nestjs-pgpromise';
import * as winston from 'winston';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BalancerFirstCheckJob } from './jobs/balancer_first_check.job';
import { CoingeckoJob } from './jobs/coingecko.job';
import { CurveFirstCheckJob } from './jobs/curve_first_check.job';
import { SushiswapJob } from './jobs/sushiswap.job';
import { UniswapJob } from './jobs/uniswap.job';
import { DatabaseService } from './services/database.service';
import { JobsService } from './services/jobs.service';
import { Api } from './thegraph/api';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.development.local',
        '.env.development',
        '.env.production.local',
        '.env.production',
        '.env',
      ],
    }),
    WinstonModule.forRoot({
      // options
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.json(),
      defaultMeta: { service: process.env.SERVICE_NAME },
      transports: [
        // NestJS console like logs
        new winston.transports.Console({
          format: winston.format.combine(
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
  controllers: [AppController],
  providers: [
    ConfigService,
    Api,
    AppService,
    JobsService,
    DatabaseService,
    CoingeckoJob,
    SushiswapJob,
    UniswapJob,
    BalancerFirstCheckJob,
    CurveFirstCheckJob,
  ],
})
export class AppModule implements OnModuleInit {
  onModuleInit(): void {
    const { SERVICE_NAME, SERVICE_PORT, SERVICE_HOST } = process.env;
    this.logger.log(
      {
        name: SERVICE_NAME,
        host: SERVICE_HOST,
        port: SERVICE_PORT,
      },
      'App',
    );
    this.logger.log(this.configService, SERVICE_NAME);
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private configService: ConfigService,
  ) {}
}
