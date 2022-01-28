import { ClassConstructor } from 'class-transformer';

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { Web3ProviderService, Web3SolanaProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MicroservicesModule } from '../microservices/microservices.module';
import { StoreModule } from '../store/store.module';
import { AutofarmApiService } from './autofarm/autofarm.api.service';
import { AutofarmStakingAVAX } from './autofarm/autofarm.staking.avax';
import { AutofarmStakingBSC } from './autofarm/autofarm.staking.bsc';
import { AutofarmStakingCELO } from './autofarm/autofarm.staking.celo';
import { AutofarmStakingCRO } from './autofarm/autofarm.staking.cro';
import { AutofarmStakingHECO } from './autofarm/autofarm.staking.heco';
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
import { CurveGaugesAvax } from './curve/curve.gauges.avax';
import { CurveGaugesFtm } from './curve/curve.gauges.ftm';
import { CurveGaugesPlg } from './curve/curve.gauges.plg';
import { CurvePools } from './curve/curve.pools';
import { CurvePoolsAvax } from './curve/curve.pools.avax';
import { CurvePoolsFtm } from './curve/curve.pools.ftm';
import { CurvePoolsPlg } from './curve/curve.pools.plg';
import { DefiKingdomsPools } from './defikingdoms/defikingdoms.pools';
import { DefiKingdomsStaking } from './defikingdoms/defikingdoms.staking';
import { EllipsisLp } from './ellipsis/ellipsis.lp';
import { EllipsisStaking } from './ellipsis/ellipsis.staking';
import { IntegrationDataConverter } from './integration.data.converter';
import { IslandswapPools } from './islandswap/islandswap.pools';
import { IslandswapStaking } from './islandswap/islandswap.staking';
import { JobInterface } from './job.interface';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { MojitoswapPools } from './mojitoswap/mojitoswap.pools';
import { MojitoswapStaking } from './mojitoswap/mojitoswap.staking';
import { PancakePoolsV1 } from './pancake/pancake.pools.v1';
import { PancakePoolsV2 } from './pancake/pancake.pools.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { PangolinPoolsAvax } from './pangolin/pangolin.pools.avax';
import { PangolinStakingAvax } from './pangolin/pangolin.staking.avax';
import { RaydiumPools } from './raydium/raydium.pools';
import { RaydiumStaking } from './raydium/raydium.staking';
import { SaberPools } from './saber/saber.pools';
import { SaberStaking } from './saber/saber.staking';
import { SpookyswapPools } from './spookyswap/spookyswap.pools';
import { SushiswapPools } from './sushiwap/sushiswap.pools';
import { DbMapping } from './traderjoe/dbmapping';
import { TraderjoePools } from './traderjoe/traderjoe.pools';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';
import { TraderJoeSubgraph } from './traderjoe/traderjoe.subgraph';
import { UniswapPoolsV2 } from './uniswap/uniswap.pools.v2';
import { ViperswapPools } from './viperswap/viperswap.pools';
import { ViperswapStaking } from './viperswap/viperswap.staking';
import { VVSPools } from './vvs/vvs.pools';
import { VVSStaking } from './vvs/vvs.staking';

export const ActiveJobs: ClassConstructor<JobInterface>[] = [
  AutofarmStakingAVAX,
  AutofarmStakingBSC,
  AutofarmStakingCELO,
  AutofarmStakingCRO,
  AutofarmStakingHECO,
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
  PancakePoolsV1,
  UniswapPoolsV2,
  SushiswapPools,
  VVSStaking,
  VVSPools,
  PangolinStakingAvax,
  PangolinPoolsAvax,
  MojitoswapPools,
  MojitoswapStaking,
  SaberPools,
  SaberStaking,
  CurvePoolsPlg,
  CurveGaugesPlg,
  CurvePoolsAvax,
  CurveGaugesAvax,
  CurvePoolsFtm,
  CurveGaugesFtm,
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
