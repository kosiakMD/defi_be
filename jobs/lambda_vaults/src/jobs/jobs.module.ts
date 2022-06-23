import { ClassConstructor } from 'class-transformer';

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { Web3ProviderService, Web3SolanaProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MicroservicesModule } from '../microservices/microservices.module';
import { StoreModule } from '../store/store.module';
import { OsmosisPools } from './Osmosis/Osmosis.pools';
import { AnchorLp } from './anchor/anchor.lp';
import { AnchorStaking } from './anchor/anchor.staking';
import { AstroportLp } from './astroport/astroport.lp';
import { AstroportStaking } from './astroport/astroport.staking';
import { BadgerStakingArbi } from './badger/badger.staking.arbi';
import { BadgerStakingEth } from './badger/badger.staking.eth';
import { BadgerStakingPLG } from './badger/badger.staking.plg';
import { ConvexStaking } from './convex/convex.staking';
import { CurveGauges } from './curve/curve.gauges';
import { CurveGaugesArbi } from './curve/curve.gauges.arbi';
import { CurveGaugesAvax } from './curve/curve.gauges.avax';
import { CurveGaugesFtm } from './curve/curve.gauges.ftm';
import { CurveGaugesGnosis } from './curve/curve.gauges.gnosis';
import { CurveGaugesHarm } from './curve/curve.gauges.harm';
import { CurveGaugesOpt } from './curve/curve.gauges.opt';
import { CurveGaugesPlg } from './curve/curve.gauges.plg';
import { CurvePools } from './curve/curve.pools';
import { CurvePoolsArbi } from './curve/curve.pools.arbi';
import { CurvePoolsAvax } from './curve/curve.pools.avax';
import { CurvePoolsFtm } from './curve/curve.pools.ftm';
import { CurvePoolsGnosis } from './curve/curve.pools.gnosis';
import { CurvePoolsHarm } from './curve/curve.pools.harm';
import { CurvePoolsOpt } from './curve/curve.pools.opt';
import { CurvePoolsPlg } from './curve/curve.pools.plg';
import { DefiKingdomsPools } from './defikingdoms/defikingdoms.pools';
import { DefiKingdomsStaking } from './defikingdoms/defikingdoms.staking';
import { EllipsisLp } from './ellipsis/ellipsis.lp';
import { EllipsisStaking } from './ellipsis/ellipsis.staking';
import { IntegrationDataConverter } from './integration.data.converter';
import { JobInterface } from './job.interface';
import { JobsRegistry } from './jobs.registry';
import { JobsRunner } from './jobs.runner';
import { JobsV3Runner } from './jobs.v3.runner';
import { MarinadePools } from './marinade/marinade.pools';
import { MarinadeUtils } from './marinade/marinade.utils';
import { MojitoswapPools } from './mojitoswap/mojitoswap.pools';
import { MojitoswapStaking } from './mojitoswap/mojitoswap.staking';
import { OrcaStaking } from './orca/orca.farms';
import { OrcaPools } from './orca/orca.pools';
import { PancakePoolsV1 } from './pancake/pancake.pools.v1';
import { PancakePoolsV2 } from './pancake/pancake.pools.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { PangolinPoolsAvax } from './pangolin/pangolin.pools.avax';
import { PangolinStakingAvax } from './pangolin/pangolin.staking.avax';
import { RaydiumPools } from './raydium/raydium.pools';
import { RaydiumStaking } from './raydium/raydium.staking';
import { SaberPools } from './saber/saber.pools';
import { SpookyswapPools } from './spookyswap/spookyswap.pools';
import { SundaeswapPools } from './sundaeswap/sundaeswap.pools';
import { SushiswapPools } from './sushiwap/sushiswap.pools';
import { TerraswapLp } from './terraswap/terraswap.lp';
import { DbMapping } from './traderjoe/dbmapping';
import { TraderjoePools } from './traderjoe/traderjoe.pools';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';
import { TraderJoeSubgraph } from './traderjoe/traderjoe.subgraph';
import { TrisolarisPools } from './trisolaris/trisolaris.pools';
import { TrisolarisStaking } from './trisolaris/trisolaris.staking';
import { UniswapPoolsV2 } from './uniswap/uniswap.pools.v2';
import { ViperswapPools } from './viperswap/viperswap.pools';
import { ViperswapStaking } from './viperswap/viperswap.staking';
import { VVSPools } from './vvs/vvs.pools';
import { VVSStaking } from './vvs/vvs.staking';
import { WingRidersPools } from './wingriders/wingriders.pools';

const Anchor = [AnchorLp, AnchorStaking];
const Astroport = [AstroportLp, AstroportStaking];

const Badger = [BadgerStakingArbi, BadgerStakingEth, BadgerStakingPLG];

const Convex = [ConvexStaking];
const Curve = [
  CurveGauges,
  CurveGaugesArbi,
  CurveGaugesAvax,
  CurveGaugesFtm,
  CurveGaugesGnosis,
  CurveGaugesHarm,
  CurveGaugesOpt,
  CurveGaugesPlg,
  CurvePools,
  CurvePoolsArbi,
  CurvePoolsAvax,
  CurvePoolsFtm,
  CurvePoolsGnosis,
  CurvePoolsHarm,
  CurvePoolsOpt,
  CurvePoolsPlg,
];
const Sundaeswap = [SundaeswapPools];
const DefiKingdoms = [DefiKingdomsPools, DefiKingdomsStaking];
const Ellipsis = [EllipsisLp, EllipsisStaking];
const Mojitoswap = [MojitoswapPools, MojitoswapStaking];
const Orca = [OrcaPools, OrcaStaking];
const Pancake = [PancakePoolsV1, PancakePoolsV2, PancakeStaking];
const Pangolin = [PangolinPoolsAvax, PangolinStakingAvax];
const Raydium = [RaydiumPools, RaydiumStaking];
const Saber = [SaberPools];
const Spookyswap = [SpookyswapPools];
const SushiSwap = [SushiswapPools];
const Terra = [TerraswapLp];
const TraderJoe = [TraderJoeStaking, TraderjoePools];
const Trisolaris = [TrisolarisPools, TrisolarisStaking];
const Uniswap = [UniswapPoolsV2];
const VVS = [VVSPools, VVSStaking];
const ViperSwap = [ViperswapPools, ViperswapStaking];
const Marinade = [MarinadePools];
const SundaeSwap = [SundaeswapPools];
const Osmosis = [OsmosisPools];
const WingRiders = [WingRidersPools];

export const ActiveJobs: ClassConstructor<JobInterface>[] = [
  ...Anchor,
  ...Astroport,
  ...Badger,
  ...Convex,
  ...Curve,
  ...SushiSwap,
  ...DefiKingdoms,
  ...Ellipsis,
  ...Mojitoswap,
  ...Orca,
  ...Pancake,
  ...Pangolin,
  ...Raydium,
  ...Saber,
  ...Spookyswap,
  ...Sundaeswap,
  ...Terra,
  ...TraderJoe,
  ...Trisolaris,
  ...Uniswap,
  ...VVS,
  ...ViperSwap,
  ...SundaeSwap,
  ...Marinade,
  ...Osmosis,
  ...WingRiders,
];

const Helpers = [TraderJoeSubgraph, DbMapping, MarinadeUtils];

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
    JobsV3Runner,
    JobsRegistry,
    IntegrationDataConverter,
    MulticallAggregator,
    Web3ProviderService,
    Web3SolanaProviderService,
    ...Helpers,
    ...ActiveJobs,
  ],
  exports: [JobsRunner, JobsV3Runner, IntegrationDataConverter],
})
export class JobsModule {}
