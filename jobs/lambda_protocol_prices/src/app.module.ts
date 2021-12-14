import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';

import { getWinstonParams } from '@app/common/Logger/logger.config';

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
        getWinstonParams('protocol_prices', configService),
    }),
    JobsModule,
  ],
})
export class AppModule {}
