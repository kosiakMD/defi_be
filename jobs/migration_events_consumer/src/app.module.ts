import * as winston from 'winston';

import { Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  utilities as nestWinstonModuleUtilities,
  WINSTON_MODULE_NEST_PROVIDER,
  WinstonModule,
} from 'nest-winston';

import configModuleConfiguration from './config/config.module';
import { MigrationModule } from './migration/migration.module';
import { StoreModule } from './store/store.module';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleConfiguration),
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
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: ['dist/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: false,
      }),
    }),
    MigrationModule,
    StoreModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
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
