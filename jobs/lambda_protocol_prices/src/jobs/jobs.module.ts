import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { TheGraphModule } from '../thegraph/thegraph.module';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { ProtocolsModule } from './protocols/protocols.module';

@Module({
  imports: [MicroservicesModule, ProtocolsModule, ChainModule, TheGraphModule],
  providers: [JobsRunner, JobsRegistry],
  exports: [JobsRunner],
})
export class JobsModule {}
