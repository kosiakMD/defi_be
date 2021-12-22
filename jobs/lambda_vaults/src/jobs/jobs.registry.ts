import { Injectable } from '@nestjs/common';

import { AutofarmStakingBSC } from './autofarm/autofarm.staking.bsc';
import { AutofarmStakingPLG } from './autofarm/autofarm.staking.plg';
import { CurvePools } from './curve/curve.pools';
import { EllipsisLp } from './ellipsis/ellipsis.lp';
import { EllipsisStaking } from './ellipsis/ellipsis.staking';
import { JobInterface } from './job.interface';
import { PancakePoolsV2 } from './pancake/pancake.pools.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { RaydiumPools } from './raydium/raydium.pools';
import { RaydiumStaking } from './raydium/raydium.staking';
import { SpookyswapPools } from './spookyswap/spookyswap.pools';
import { TraderjoePools } from './traderjoe/traderjoe.pools';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';
import { ViperswapStaking } from './viperswap/viperswap.staking';
import { ViperswapPools } from './viperswap/viperswap.pools';
import { BadgerStakingPLG } from './badger/badger.staking.plg';
import { BadgerStakingArbi } from './badger/badger.staking.arbi';
import { BadgerStakingEth } from './badger/badger.staking.eth';
import { DefiKingdomsStaking } from './defikingdoms/defikingdoms.staking';
import { DefiKingdomsPools } from './defikingdoms/defikingdoms.pools';

@Injectable()
export class JobsRegistry {
  public readonly registry: Map<string, JobInterface> = new Map<string, JobInterface>();

  constructor(
    curvePools: CurvePools,
    pancakeStaking: PancakeStaking,
    pancakeLPV2: PancakePoolsV2,
    traderjoeLp: TraderjoePools,
    traderjoeStaking: TraderJoeStaking,
    spookyswapLp: SpookyswapPools,
    ellipsisLp: EllipsisLp,
    ellipsisStaking: EllipsisStaking,
    autofarmStakingBSC: AutofarmStakingBSC,
    autofarmStakingPLG: AutofarmStakingPLG,
    raydiymPools: RaydiumPools,
    raydiumStaking: RaydiumStaking,
    viperswapStaking: ViperswapStaking,
    viperswapPools: ViperswapPools,
    badgerStakingPLG: BadgerStakingPLG,
    badgerStakingArbi: BadgerStakingArbi,
    badgerStakingEth: BadgerStakingEth,
    defiKingdomsStaking: DefiKingdomsStaking,
    defiKingdomsPools: DefiKingdomsPools,
  ) {
    this.registry.set(curvePools.placeholder, curvePools);
    this.registry.set(pancakeStaking.placeholder, pancakeStaking);
    this.registry.set(pancakeLPV2.placeholder, pancakeLPV2);
    this.registry.set(traderjoeLp.placeholder, traderjoeLp);
    this.registry.set(traderjoeStaking.placeholder, traderjoeStaking);
    this.registry.set(spookyswapLp.placeholder, spookyswapLp);
    this.registry.set(ellipsisLp.placeholder, ellipsisLp);
    this.registry.set(ellipsisStaking.placeholder, ellipsisStaking);
    this.registry.set(autofarmStakingBSC.placeholder, autofarmStakingBSC);
    this.registry.set(autofarmStakingPLG.placeholder, autofarmStakingPLG);
    this.registry.set(raydiymPools.placeholder, raydiymPools);
    this.registry.set(raydiumStaking.placeholder, raydiumStaking);
    this.registry.set(viperswapStaking.placeholder, viperswapStaking);
    this.registry.set(viperswapPools.placeholder, viperswapPools);
    this.registry.set(badgerStakingPLG.placeholder, badgerStakingPLG);
    this.registry.set(badgerStakingArbi.placeholder, badgerStakingArbi);
    this.registry.set(badgerStakingEth.placeholder, badgerStakingEth);
    this.registry.set(defiKingdomsStaking.placeholder, defiKingdomsStaking);
    this.registry.set(defiKingdomsPools.placeholder, defiKingdomsPools);
  }
}
