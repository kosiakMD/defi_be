import { ClassConstructor } from 'class-transformer';

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { Web3ProviderService, Web3SolanaProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MicroservicesModule } from '../microservices/microservices.module';
import { StoreModule } from '../store/store.module';
import { AutofarmApiService } from './autofarm/autofarm.api.service';
import { AutofarmStakingBSC } from './autofarm/autofarm.staking.bsc';
import { AutofarmStakingPLG } from './autofarm/autofarm.staking.plg';
import { BadgerStakingArbi } from './badger/badger.staking.arbi';
import { BadgerStakingEth } from './badger/badger.staking.eth';
import { BadgerStakingPLG } from './badger/badger.staking.plg';
import { BeefyApiService } from './beefy/beefy.api.service';
import { BeefyStakingArbi } from './beefy/beefy.staking.arbi';
import { BeefyStakingAvax } from './beefy/beefy.staking.avax';
import { BeefyStakingBsc } from './beefy/beefy.staking.bsc';
import { BeefyStakingCelo } from './beefy/beefy.staking.celo';
import { BeefyStakingCro } from './beefy/beefy.staking.cro';
import { BeefyStakingFtm } from './beefy/beefy.staking.ftm';
import { BeefyStakingMoonRiver } from './beefy/beefy.staking.mriver';
import { BeefyStakingOne } from './beefy/beefy.staking.one';
import { BeefyStakingPlg } from './beefy/beefy.staking.plg';
import { ConvexStaking } from './convex/convex.staking';
import { CurveGauges } from './curve/curve.gauges';
import { CurvePools } from './curve/curve.pools';
import { DefiKingdomsPools } from './defikingdoms/defikingdoms.pools';
import { DefiKingdomsStaking } from './defikingdoms/defikingdoms.staking';
import { EllipsisLp } from './ellipsis/ellipsis.lp';
import { EllipsisStaking } from './ellipsis/ellipsis.staking';
import { IslandswapPools } from './islandswap/islandswap.pools';
import { IslandswapStaking } from './islandswap/islandswap.staking';
import { IntegrationDataConverter } from './integration.data.converter';
import { JobInterface } from './job.interface';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { MojitoswapPools } from './mojitoswap/mojitoswap.pools';
import { MojitoswapStaking } from './mojitoswap/mojitoswap.staking';
import { PancakePoolsV2 } from './pancake/pancake.pools.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { PangolinPoolsAvax } from './pangolin/pangolin.pools.avax';
import { PangolinStakingAvax } from './pangolin/pangolin.staking.avax';
import { RaydiumPools } from './raydium/raydium.pools';
import { RaydiumStaking } from './raydium/raydium.staking';
import { SaberPools } from './saber/saber.pools';
import { SaberStaking } from './saber/saber.staking';
import { SpookyswapPools } from './spookyswap/spookyswap.pools';
import { DbMapping } from './traderjoe/dbmapping';
import { TraderjoePools } from './traderjoe/traderjoe.pools';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';
import { TraderJoeSubgraph } from './traderjoe/traderjoe.subgraph';
import { ViperswapPools } from './viperswap/viperswap.pools';
import { ViperswapStaking } from './viperswap/viperswap.staking';
import { VVSPools } from './vvs/vvs.pools';
import { VVSStaking } from './vvs/vvs.staking';

export const ActiveJobs: ClassConstructor<JobInterface>[] = [
  AutofarmStakingBSC,
  AutofarmStakingPLG,
  BadgerStakingArbi,
  BadgerStakingEth,
  BadgerStakingPLG,
  BeefyStakingArbi,
  BeefyStakingAvax,
  BeefyStakingBsc,
  BeefyStakingCelo,
  BeefyStakingCro,
  BeefyStakingFtm,
  BeefyStakingMoonRiver,
  BeefyStakingOne,
  BeefyStakingPlg,
  ConvexStaking,
  CurveGauges,
  CurvePools,
  DefiKingdomsPools,
  DefiKingdomsStaking,
  EllipsisLp,
  EllipsisStaking,
  IslandswapPools,
  IslandswapStaking,
  MojitoswapPools,
  MojitoswapStaking,
  PancakePoolsV2,
  PancakeStaking,
  PangolinPoolsAvax,
  PangolinStakingAvax,
  RaydiumPools,
  RaydiumStaking,
  SaberPools,
  SaberStaking,
  SpookyswapPools,
  TraderJoeStaking,
  TraderjoePools,
  VVSPools,
  VVSStaking,
  ViperswapPools,
  ViperswapStaking,
];

const Helpers = [TraderJoeSubgraph, BeefyApiService, AutofarmApiService, DbMapping];

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
    Web3SolanaProviderService,
    ...Helpers,
    ...ActiveJobs,
  ],
  exports: [JobsRunner, IntegrationDataConverter],
})
export class JobsModule {}
