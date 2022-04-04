import { Inject, LoggerService, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import configuration from '@app/common/config/configuration';
import { AllExceptionsFilter } from '@app/common/interceptors/all-exceptions.filter';

import { CommonModule } from './common/common.module';
import { DatabaseConfigService } from './config/database/db.config.service';
import config from './config/index';
import { AssetsCategoryModule } from './modules/assets-category/assets-category.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AwsModule } from './modules/aws/aws.module';
import { PricesModule } from './modules/prices/prices.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfigService,
    }),
    AssetsModule,
    AwsModule,
    CommonModule,
    PricesModule,
    AssetsCategoryModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

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
