import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { REDIS_TASK_QUEUE } from '../../common/constants';

import { AggregatorModule } from '../aggregators/aggregator.module';
import { ProtocolModule } from '../protocols/protocols.module';
import { TasksProcessor } from './tasks.processor';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: +configService.get<number>('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: REDIS_TASK_QUEUE,
    }),
    AggregatorModule,
    ProtocolModule,
  ],
  providers: [TasksProcessor, TasksService],
  exports: [TasksService],
})
export class TasksModule {}
