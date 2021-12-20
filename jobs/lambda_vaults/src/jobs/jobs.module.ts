import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { Web3ProviderService, Web3SolanaProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MicroservicesModule } from '../microservices/microservices.module';
import { StoreModule } from '../store/store.module';
import { AutofarmApiService } from './autofarm/autofarm.api.service';
import { AutofarmStakingBSC } from './autofarm/autofarm.staking.bsc';
import { AutofarmStakingPLG } from './autofarm/autofarm.staking.plg';
import { CurvePools } from './curve/curve.pools';
import { EllipsisLp } from './ellipsis/ellipsis.lp';
import { EllipsisStaking } from './ellipsis/ellipsis.staking';
import { IntegrationDataConverter } from './integration.data.converter';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { PancakePoolsV2 } from './pancake/pancake.pools.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { RaydiumPools } from './raydium/raydium.pools';
import { RaydiumStaking } from './raydium/raydium.staking';
import { SpookyswapPools } from './spookyswap/spookyswap.pools';
import { DbMapping } from './traderjoe/dbmapping';
import { TraderjoePools } from './traderjoe/traderjoe.pools';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';
import { TraderJoeSubgraph } from './traderjoe/traderjoe.subgraph';
import { ViperswapStaking } from './viperswap/viperswap.staking';
import { ViperswapPools } from './viperswap/viperswap.pools';
import { BadgerStakingPLG } from './badger/badger.staking.plg';
import { BadgerStakingArbi } from './badger/badger.staking.arbi';
import { BadgerStakingEth } from './badger/badger.staking.eth';

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
  RaydiumPools,
  RaydiumStaking,
  AutofarmApiService,
  ViperswapStaking,
  ViperswapPools,
  BadgerStakingPLG,
  BadgerStakingArbi,
  BadgerStakingEth,
];

@Module({
  imports: [
    MicroservicesModule,
    StoreModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [
    JobsRunner,
    JobsRegistry,
    IntegrationDataConverter,
    MulticallAggregator,
    Web3ProviderService,
    TraderJoeSubgraph,
    Web3SolanaProviderService,
    ...Jobs,
  ],
  exports: [JobsRunner, IntegrationDataConverter],
})
export class JobsModule {}
