import { Inject, MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger, WinstonModule } from 'nest-winston';

import { HealthModule } from './health/health.module';
import { LookupModule } from './lookup/lookup.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { PricesModule } from './prices/prices.module';
import { winstonParams } from './utils/winston';

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
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        winstonParams(
          configService.get<string>('LOG_ERROR_FILE'),
          configService.get<string>('LOG_COMBINED_FILE'),
          configService.get<string>('SERVICE_NAME'),
          configService.get<string>('LOG_LEVEL'),
        ),
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
