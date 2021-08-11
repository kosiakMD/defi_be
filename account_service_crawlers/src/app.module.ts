import {
  utilities as nestWinstonModuleUtilities,
  WINSTON_MODULE_NEST_PROVIDER,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';

import { HttpModule, Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import configuration from './config/configuration';
import { JobsModule } from './jobs/jobs.module';
import { JobsService } from './jobs/jobs.service';
import { LoggerModule } from './logger/logger.module';
import { MigrationModule } from './migrations/migration.module';
import { NodeModule } from './node/node.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration),
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        // schema: configService.get<string>('DB_SCHEMA'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        // entities: [configService.get<string>('DB_ENTITIES')],
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
    }),
    TerminusModule,
    HttpModule.register({
      timeout: 60e3,
      maxRedirects: 2,
    }),
    JobsModule,
    NodeModule,
    MigrationModule,
    LoggerModule,
  ],
  providers: [JobsService],
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
