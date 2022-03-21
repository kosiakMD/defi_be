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
import { IfModule } from './modules/if_poc/if.module';
import { ProtocolsRegistry } from './modules/if_poc/protocols.registry';
import { FrameworkModule } from './modules/integrations/framework/framework.module';
import { FrameworkService } from './modules/integrations/framework/framework.service';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ProtocolModule } from './modules/protocols/protocol.module';
import { ThegraphModule } from './modules/subgraphs/thegraph.module';
import { TemporaryTokensModule } from './modules/temporary_tokens/temporary.tokens.module';
import { IntegrationsServiceV2 } from './modules/integrations/integrations.service.v2';

@Module({
  imports: [
    FrameworkModule,
    IfModule,
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
    // private readonly frameworkService: FrameworkService, //todo remove me (was added for testing purposes)
    // private readonly protocolsRegistry: ProtocolsRegistry, //todo remove me (was added for testing purposes)
    private readonly integrationServiceV2: IntegrationsServiceV2, //todo remove me (was added for testing purposes)
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

    this.start();
  }

  async start() {
    await new Promise((resolve) => setTimeout(resolve, 2000)); //wait a bit for app to fully start

    // works as well
    // await this.integrationServiceV2.loadVaults({
    //   chainCode:"near",
    //   protocolCode:"trisolaris",
    //   contractAddress:"0x1f1ed214bef5e83d8f5d0eb5d7011eb965d0d79b",
    //   contractAbi: []
    // })

    // works as well
    await this.integrationServiceV2.loadVaults({
      chainCode:"bsc",
      protocolCode:"pancake",
      contractAddress: "0x73feaa1ee314f8c655e354234017be2193c9e24e",
      contractAbi: []
    });

    await this.integrationServiceV2.loadPeriodicalData({
      chainCode:"bsc",
      protocolCode:"pancake"
    });

    const accountBalances = await this.integrationServiceV2.loadAccountsData({
      chainCode:"bsc",
      protocolCode:"pancake",
      addresses: ['0xbcb4c77d0a41aaffd850b8b522bda79ac1dd2c5a', '0x4e796EA3819b6d59C53554B35DBD32C0111936Ce', '0xff99012a107ab88b19a08b3d83a6fa2fb561e6d8']
    })
    console.log(accountBalances);

    //
    // // single staking contract
    // await this.integrationServiceV2.loadVaults({
    //   chainCode:"bsc",
    //   protocolCode:"pancake",
    //   contractAddress: "0x260F95f5b7FD8eda720ED9d0829164dE35B048ab",
    //   contractAbi: []
    // })
    //
    // await this.integrationServiceV2.loadVaults({
    //   chainCode:"bsc",
    //   protocolCode:"pancake",
    //   contractAddress: "0x25ca61796d786014ffe15e42ac11c7721d46e120",
    //   contractAbi: []
    // })


    // console.log(accountBalances);

    // await this.integrationServiceV2.loadAccountsData({
    //   chainCode: "bsc",
    //   protocolCode: "pancake",
    //   addresses: ['0xbcb4c77d0a41aaffd850b8b522bda79ac1dd2c5a', '0x4e796EA3819b6d59C53554B35DBD32C0111936Ce', '0xff99012a107ab88b19a08b3d83a6fa2fb561e6d8']
    // });

    // load
    // await this.integrationServiceV2.loadVaults({
    //   chainCode:"bsc",
    //   protocolCode:"pancake",
    //   contractAddress: "0x73feaa1eE314F8c655E354234017bE2193C9E24E",
    //   contractAbi: []
    // })
  }
}
