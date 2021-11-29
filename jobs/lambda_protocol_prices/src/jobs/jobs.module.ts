import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { CompoundProtocol } from './compound/compound.protocol';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';

const protocols = [
  CompoundProtocol, //
];

@Module({
  imports: [MicroservicesModule, ChainModule],
  providers: [JobsRunner, JobsRegistry, ...protocols],
  exports: [JobsRunner],
})
export class JobsModule {}
