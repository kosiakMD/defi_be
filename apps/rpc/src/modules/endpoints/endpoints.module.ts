import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EndpointEntity } from './endpoint.entity';
import { EndpointsRepository } from './endpoints.repository';
import { EndpointsStatisticService } from './services/endpoints-statistic.service';
import { EndpointsService } from './services/endpoints.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EndpointEntity, EndpointsRepository]),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [EndpointsService, EndpointsStatisticService],
  exports: [EndpointsService, EndpointsStatisticService],
})
export class EndpointsModule {}
