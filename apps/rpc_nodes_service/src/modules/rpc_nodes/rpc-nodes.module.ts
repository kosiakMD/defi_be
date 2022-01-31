import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EndpointsEntity } from '../endpoints/endpoints.entity';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { EndpointsRepository } from '../endpoints/endpoints.repository';
import { RPCNodesService } from './rpc-nodes.service';

@Module({
  imports: [EndpointsModule, TypeOrmModule.forFeature([EndpointsEntity, EndpointsRepository])],
  controllers: [],
  providers: [RPCNodesService],
  exports: [RPCNodesService],
})
export class RPCNodesModule {}
