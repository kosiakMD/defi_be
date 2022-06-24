import { Inject, LoggerService, MiddlewareConsumer, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { HttpModule, LogRequestMiddleware } from '@app/common';
import { getWinstonParams } from '@app/common/Logger/logger.config';

import { AppController } from './controllers/app.controller';
import { QueueManagementController } from './controllers/queue.management.controller';
import { StatusController } from './controllers/status.controller';
import { ProtocolModule } from './modules/protocols/protocols.module';
import { ServicesModule } from './modules/services/services.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule,
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('categorization', configService),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('HTTP_TIMEOUT') || 60e3,
        maxRedirects: configService.get<number>('HTTP_MAX_REDIRECTS') || 2,
      }),
      inject: [ConfigService],
    }),
    TasksModule,
    ProtocolModule,
    ServicesModule,
  ],
  providers: [],
  controllers: [AppController, StatusController, QueueManagementController],
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
