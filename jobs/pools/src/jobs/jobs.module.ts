import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { StoreModule } from '../store/store.module';
import { IntegrationDataConverter } from './integration.data.converter';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { PancakeLpV2 } from './pancake/pancake.lp.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { TraderjoeLp } from './traderjoe/traderjoe.lp';

@Module({
  imports: [MicroservicesModule, ChainModule, StoreModule],
  providers: [JobsRunner, JobsRegistry, IntegrationDataConverter, PancakeStaking, PancakeLpV2, TraderjoeLp],
  exports: [JobsRunner, IntegrationDataConverter],
})
export class JobsModule {}
