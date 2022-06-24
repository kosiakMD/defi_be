import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HttpModule } from '@app/common';

import { EndpointEntity } from '../endpoints/endpoint.entity';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { EndpointsRepository } from '../endpoints/endpoints.repository';
import { RpcService } from './rpc.service';

@Module({
  imports: [
    HttpModule,
    EndpointsModule,
    TypeOrmModule.forFeature([EndpointEntity, EndpointsRepository]),
  ],
  controllers: [],
  providers: [RpcService],
  exports: [RpcService],
})
export class RpcModule {}
