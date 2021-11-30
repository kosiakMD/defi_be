import { Module } from '@nestjs/common';

import { MicroservicesModule } from '../microservices/microservices.module';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { ProtocolsModule } from './protocols/protocols.module';

@Module({
  imports: [MicroservicesModule, ProtocolsModule],
  providers: [JobsRunner, JobsRegistry],
  exports: [JobsRunner],
})
export class JobsModule {}
