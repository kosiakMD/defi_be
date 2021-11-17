import { Module } from '@nestjs/common';

import { ChainModule } from '../chain/chain.module';
import { MicroservicesModule } from '../microservices/microservices.module';
import { StoreModule } from '../store/store.module';
import { IntegrationDataConverter } from './integration.data.converter';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { PancakePoolsV2 } from './pancake/pancake.pools.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { SpookyswapPools } from './spookyswap/spookyswap.pools';
import { DbMapping } from './traderjoe/dbmapping';
import { TraderjoePools } from './traderjoe/traderjoe.pools';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';

@Module({
  imports: [MicroservicesModule, ChainModule, StoreModule],
  providers: [
    JobsRunner,
    JobsRegistry,
    IntegrationDataConverter,
    PancakeStaking,
    PancakePoolsV2,
    TraderjoePools,
    TraderJoeStaking,
    DbMapping,
    SpookyswapPools,
  ],
  exports: [JobsRunner, IntegrationDataConverter],
})
export class JobsModule {}
