import { Module } from '@nestjs/common';

import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MicroservicesModule } from '../microservices/microservices.module';
import { StoreModule } from '../store/store.module';
import { CurvePools } from './curve/curve.pools';
import { EllipsisLp } from './ellipsis/ellipsis.lp';
import { EllipsisStaking } from './ellipsis/ellipsis.staking';
import { IntegrationDataConverter } from './integration.data.converter';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { PancakePoolsV2 } from './pancake/pancake.pools.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { SpookyswapPools } from './spookyswap/spookyswap.pools';
import { DbMapping } from './traderjoe/dbmapping';
import { TraderjoePools } from './traderjoe/traderjoe.pools';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';
import { AutofarmStakingBSC } from './autofarm/autofarm.staking.bsc';
import { AutofarmStakingPLG } from './autofarm/autofarm.staking.plg';

const Jobs = [
  CurvePools,
  DbMapping,
  EllipsisLp,
  EllipsisStaking,
  PancakePoolsV2,
  PancakeStaking,
  SpookyswapPools,
  TraderJoeStaking,
  TraderjoePools,
  AutofarmStakingBSC,
  AutofarmStakingPLG,
];

@Module({
  imports: [MicroservicesModule, StoreModule],
  providers: [
    JobsRunner,
    JobsRegistry,
    IntegrationDataConverter,
    MulticallAggregator,
    Web3ProviderService,
    ...Jobs,
  ],
  exports: [JobsRunner, IntegrationDataConverter],
})
export class JobsModule {}
