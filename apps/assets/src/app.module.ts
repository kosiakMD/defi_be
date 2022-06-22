import { HttpTracingModule, TracingModule } from '@narando/nest-xray';
import { BullModule } from '@nestjs/bull';
import { Inject, MiddlewareConsumer, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { Logger, LogRequestMiddleware } from '@app/common';
import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';
import { interceptorsOrder } from '@app/common/interceptors';
import { AllExceptionsFilter } from '@app/common/interceptors/all-exceptions.filter';

import { AwsModule } from './aws/aws.module';
import { CommonModule } from './common/common.module';
import { QueueName } from './common/enum/queue-name.enum';
import { DatabaseConfigService } from './config/database/db.config.service';
import config from './config/index';
import { JobsController } from './controllers/jobs.controller';
import { AssetsCategoryModule } from './modules/assets-category/assets-category.module';
import { AssetsModule } from './modules/assets/assets.module';
import { PricesModule } from './modules/prices/prices.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(configuration(config)),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => getWinstonParams('assets', configService),
    }),
    BullModule.registerQueue({
      name: QueueName.ASSETS,
      settings: {
        maxStalledCount: 0,
      },
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    BullModule.registerQueue({
      name: QueueName.PRICES,
      settings: {
        maxStalledCount: 0,
      },
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
    TracingModule.forRoot({ serviceName: 'assets-service' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfigService,
    }),
    HttpTracingModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT') || 60e3,
        maxRedirects: configService.get<number>('HTTP_MAX_REDIRECTS') || 2,
      }),
      inject: [ConfigService],
    }),
    AwsModule,
    CommonModule,
    AssetsModule,
    PricesModule,
    AssetsCategoryModule,
  ],
  controllers: [JobsController],
  providers: [
    // TODO: Fix this, remove 'ResponseInterceptor'
    ...interceptorsOrder.slice(2, 1),
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LogRequestMiddleware).forRoutes('*');
  }

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
