import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EndpointsEntity } from './endpoints.entity';
import { EndpointsRepository } from './endpoints.repository';
import { EndpointsToRPCCallService } from './services/endpoints-to-rpc-call.service';
import { EndpointsService } from './services/endpoints.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EndpointsEntity, EndpointsRepository]),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [EndpointsService, EndpointsToRPCCallService],
  exports: [EndpointsService, EndpointsToRPCCallService],
})
export class EndpointsModule {}
