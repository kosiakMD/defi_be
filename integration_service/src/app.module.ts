import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';

import { Inject, LoggerService, MiddlewareConsumer, Module, OnModuleInit } from '@nestjs/common';
import { HttpModule } from '@nestjs/common/http/http.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { IntegrationsModule } from './integrations/integrations.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { PancakeModule } from './pancake/pancake.module';
import { PoolsModule } from './pools/pools.module';
import { ProtocolModule } from './protocol/protocol.module';
import { SushiswapModule } from './sushiswap/sushiswap.module';
import { TemporaryTokensModule } from './temporary_tokens/temporary.tokens.module';
import { ThegraphModule } from './thegraph/thegraph.module';
import { UniswapModule } from './uniswap/uniswap.module';
import { winstonParams } from './utils/winston';
import { VaultsModule } from './vaults/vaults.module';
import { AutofarmModule } from './autofarm/autofarm.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot(configuration),
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
    TerminusModule,
    ThegraphModule,
    //
    UniswapModule,
    ProtocolModule,
    PoolsModule,
    DatabaseModule,
    VaultsModule,
    SushiswapModule,
    PancakeModule,
    TemporaryTokensModule,
    IntegrationsModule,
    AutofarmModule,
    JobsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements OnModuleInit {
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
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private configService: ConfigService,
  ) {}
}
