import { HttpModule } from '@nestjs/axios';
import { Inject, LoggerService, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { getWinstonParams } from '@app/common/Logger/logger.config';
import configuration from '@app/common/config/configuration';
import { AllExceptionsFilter } from '@app/common/interceptors/AllExceptionsFilter';
import { SentryInterceptor } from '@app/common/interceptors/SentryInterceptor';
import { TransformHeadersInterceptor } from '@app/common/interceptors/TransformHeaderInterceptor';
import { LoggerMiddleware } from '@app/common/middlewares';
import { HeadersMiddleware } from '@app/common/middlewares/headers.middleware';

import config from './config';
import { HealthController } from './controllers/health.controller';
import { FrameworkModule } from './modules/integrations/framework/framework.module';
import { FrameworkService } from './modules/integrations/framework/framework.service';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ProtocolModule } from './modules/protocols/protocol.module';
import { ThegraphModule } from './modules/subgraphs/thegraph.module';
import { TemporaryTokensModule } from './modules/temporary_tokens/temporary.tokens.module';

@Module({
  imports: [
    FrameworkModule,
    ConfigModule.forRoot(configuration(config)),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('integration', configService),
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
    TerminusModule,
    ThegraphModule,
    ProtocolModule,
    TemporaryTokensModule,
    IntegrationsModule,
    JobsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformHeadersInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HeadersMiddleware, LoggerMiddleware).forRoutes('/');
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly frameworkService: FrameworkService, //todo remove me (was added for testing purposes)
  ) {}

  onModuleInit(): void {
    const { ENV, SERVICE_PORT, SERVICE_HOST } = process.env;
    this.logger.log(
      {
        env: ENV,
        host: SERVICE_HOST,
        port: SERVICE_PORT,
      },
      'App',
    );

    //this.start();
  }

  async start() {
    await new Promise((resolve) => setTimeout(resolve, 2000)); //wait a bit for app to fully start
    this.frameworkService.start();
  }
}
