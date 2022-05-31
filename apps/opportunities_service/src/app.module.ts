import { HttpTracingModule, TracingModule } from '@narando/nest-xray';
import { Inject, LoggerService, MiddlewareConsumer, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import configuration from '@app/common/config/configuration';
import { interceptorsOrder } from '@app/common/interceptors';
import { getWinstonParams } from '@app/common/logger/logger.config';
import { LogRequestMiddleware } from '@app/common/middlewares';
import { HeadersContextMiddleware } from '@app/common/middlewares/headers-context.middleware';

import config from './config';
import { HealthController } from './controllers/health.controller';
import { OpportunitiesController } from './controllers/opportunities.controller';
import { DatabaseModule } from './modules/database/database.module';
import { OpportunityModule } from './modules/opportunity/opportunity.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration(config)),
    TracingModule.forRoot({ serviceName: 'opportunities-service' }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        getWinstonParams('account', configService),
    }),
    HttpTracingModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get('http.timeout'),
        maxRedirects: configService.get('http.maxRedirects'),
      }),
      inject: [ConfigService],
    }),
    TerminusModule,
    DatabaseModule,
    OpportunityModule,
  ],
  controllers: [OpportunitiesController, HealthController],
  providers: [...interceptorsOrder],
})
export class AppModule implements OnModuleInit {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HeadersContextMiddleware, LogRequestMiddleware).forRoutes('*');
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
