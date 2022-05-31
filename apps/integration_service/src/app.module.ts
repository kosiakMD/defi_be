import { HttpTracingModule, TracingModule } from '@narando/nest-xray';
import { Inject, MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { Logger } from '@app/common';
import configuration from '@app/common/config/configuration';
import { interceptorsOrder } from '@app/common/interceptors';
import { AllExceptionsFilter } from '@app/common/interceptors/all-exceptions.filter';
import { getWinstonParams } from '@app/common/logger/logger.config';
import { LogRequestMiddleware } from '@app/common/middlewares';
import { HeadersContextMiddleware } from '@app/common/middlewares/headers-context.middleware';

import config from './config';
import { HealthController } from './controllers/health.controller';
import { IntegrationsModule } from './modules/integration/integrations.module';
import { JobsModule } from './modules/job/jobs.module';
import { ProtocolModule } from './modules/protocol/protocol.module';
import { ThegraphModule } from './modules/subgraph/thegraph.module';
import { TemporaryTokensModule } from './modules/temporary-tokens/temporary-tokens.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    TracingModule.forRoot({ serviceName: 'integration-service' }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('integration', configService),
    }),
    HttpTracingModule.registerAsync({
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
        logging: true,
      }),
    }),
    TerminusModule,
    ThegraphModule,
    ProtocolModule,
    TemporaryTokensModule,
    IntegrationsModule,
    JobsModule,
  ].sort(),
  controllers: [HealthController],
  providers: [
    ...interceptorsOrder,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements OnModuleInit, NestModule {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HeadersContextMiddleware, LogRequestMiddleware).forRoutes('*');
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
