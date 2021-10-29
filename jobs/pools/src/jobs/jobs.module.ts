import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { StoreModule } from '../store/store.module';
import { IntegrationDataConverter } from './integration.data.converter';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { PancakeStaking } from './pancake/pancake.staking';

@Module({
  imports: [MicroservicesModule, ChainModule, StoreModule],
  providers: [JobsRunner, JobsRegistry, IntegrationDataConverter, PancakeStaking],
  exports: [JobsRunner, IntegrationDataConverter],
})
export class JobsModule {}
