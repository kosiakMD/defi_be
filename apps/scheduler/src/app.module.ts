import { HttpTracingModule, TracingModule } from '@narando/nest-xray';
import { Inject, LoggerService, MiddlewareConsumer, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { LogRequestMiddleware } from '@app/common';
import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';

import config from './config';
import { StatusController } from './controllers/status.controller';
import { TaskController } from './controllers/task.controller';
import { DatabaseModule } from './database/database.module';
import { TaskModule } from './modules/tasks/task.module';

@Module({
  imports: [
    TaskModule,
    // ConfigModule,
    ConfigModule.forRoot(configuration(config)),
    DatabaseModule,
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('scheduler', configService),
    }),
    TracingModule.forRoot({ serviceName: 'scheduler' }),
    HttpTracingModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get('HTTP_TIMEOUT') || 60e3,
        maxRedirects: configService.get('HTTP_MAX_REDIRECTS') || 2,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [],
  controllers: [StatusController, TaskController],
})
export class AppModule implements OnModuleInit {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LogRequestMiddleware).forRoutes('*');
  }

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
}
