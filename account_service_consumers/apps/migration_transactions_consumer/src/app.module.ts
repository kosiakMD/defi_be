import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { HttpModule, Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from './chain/chain.module';
import configModuleConfiguration from './config/config.module';
import { TransactionsParsingModule } from './parsing_transactions/transactions.parsing.module';
import { PriceModule } from './price/price.module';
import { winstonParams } from './util/winston';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleConfiguration),
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
    ChainModule,
    PriceModule,
    TransactionsParsingModule,
  ],
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
