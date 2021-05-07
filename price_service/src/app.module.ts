import { Inject, MiddlewareConsumer, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/common/http/http.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger, WinstonModule } from 'nest-winston';

import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { LookupModule } from './lookup/lookup.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { PricesModule } from './prices/prices.module';
import { winstonParams } from './utils/winston';

@Module({
  imports: [
    ConfigModule.forRoot(configuration),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        winstonParams({
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
        schema: configService.get<string>('DB_SCHEMA'),
        autoLoadEntities: true,
        logging: true,
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
    PricesModule,
    HealthModule,
    LookupModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('/');
  }

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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: WinstonLogger,
    private configService: ConfigService,
  ) {}
}
