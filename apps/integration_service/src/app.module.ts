import { HttpModule } from '@nestjs/axios';
import { Inject, LoggerService, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { LoggerMiddleware } from '@app/common';
import configuration from '@app/common/config/configuration';
import { Environment, winstonParams } from '@app/common/utils/winston';

import config from './config';
import { HealthController } from './health/health.controller';
import { IntegrationsModule } from './integrations/integrations.module';
import { JobsModule } from './jobs/jobs.module';
import { ProtocolModule } from './protocol/protocol.module';
import { TemporaryTokensModule } from './temporary_tokens/temporary.tokens.module';
import { ThegraphModule } from './thegraph/thegraph.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        winstonParams({
          identifier: 'integration',
          environment: configService.get<Environment>('NODE_ENV'),
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
        logging: true,
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
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('/');
    this.log();
  }

  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {
    this.log();
  }

  private log() {
    const { SERVICE_NAME, SERVICE_PORT, SERVICE_HOST } = process.env;
    this.logger.log(
      {
        name: SERVICE_NAME,
        host: SERVICE_HOST,
        port: SERVICE_PORT,
      },
      'AppModule',
    );
  }
}
