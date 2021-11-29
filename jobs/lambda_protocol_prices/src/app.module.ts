import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';

import { Environment, winstonParams } from '@app/common/utils/winston';

import { lambdaConfiguration } from './config';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
    }),
    ConfigModule.forRoot(lambdaConfiguration()),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        winstonParams({
          identifier: 'protocol_prices',
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
    JobsModule,
  ],
})
export class AppModule {}
