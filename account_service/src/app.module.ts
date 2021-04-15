import { Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  utilities as nestWinstonModuleUtilities,
  WINSTON_MODULE_NEST_PROVIDER,
  WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';

import { ApprovalsModule } from './modules/approvals/approvals.module';
import { ExamplesModule } from './modules/examples/example.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('TYPEORM_HOST'),
        port: configService.get<number>('TYPEORM_PORT'),
        username: configService.get<string>('TYPEORM_USERNAME'),
        password: configService.get<string>('TYPEORM_PASSWORD'),
        database: configService.get<string>('TYPEORM_DATABASE'),
        schema: configService.get<string>('TYPEORM_SCHEMA'),
        autoLoadEntities: true,
        logging: true,
      }),
    }),
    TerminusModule,
    ExamplesModule,
    ApprovalsModule,
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
    this.logger.log(this.configService, SERVICE_NAME);
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private configService: ConfigService,
  ) {}
}
