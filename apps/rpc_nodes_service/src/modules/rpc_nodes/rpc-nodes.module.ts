import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EndpointEntity } from '../endpoints/endpoint.entity';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { EndpointsRepository } from '../endpoints/endpoints.repository';
import { RPCNodesService } from './rpc-nodes.service';

@Module({
  imports: [
    HttpModule,
    EndpointsModule,
    TypeOrmModule.forFeature([EndpointEntity, EndpointsRepository]),
  ],
  controllers: [],
  providers: [RPCNodesService],
  exports: [RPCNodesService],
})
export class RPCNodesModule {}
