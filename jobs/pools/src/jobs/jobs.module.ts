import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { StoreModule } from '../store/store.module';
import { EllipsisLp } from './ellipsis/ellipsis.lp';
import { IntegrationDataConverter } from './integration.data.converter';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { PancakeLpV2 } from './pancake/pancake.lp.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { DbMapping } from './traderjoe/dbmapping';
import { TraderjoeLp } from './traderjoe/traderjoe.lp';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';

@Module({
  imports: [MicroservicesModule, ChainModule, StoreModule],
  providers: [
    JobsRunner,
    JobsRegistry,
    IntegrationDataConverter,
    PancakeStaking,
    PancakeLpV2,
    TraderjoeLp,
    TraderJoeStaking,
    EllipsisLp,
    DbMapping,
  ],
  exports: [JobsRunner, IntegrationDataConverter],
})
export class JobsModule {}
