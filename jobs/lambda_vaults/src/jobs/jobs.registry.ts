/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';

import { AutofarmStakingBSC } from './autofarm/autofarm.staking.bsc';
import { AutofarmStakingPLG } from './autofarm/autofarm.staking.plg';
import { BadgerStakingArbi } from './badger/badger.staking.arbi';
import { BadgerStakingEth } from './badger/badger.staking.eth';
import { BadgerStakingPLG } from './badger/badger.staking.plg';
import { BeefyStakingArbi } from './beefy/beefy.staking.arbi';
import { BeefyStakingAvax } from './beefy/beefy.staking.avax';
import { BeefyStakingBsc } from './beefy/beefy.staking.bsc';
import { BeefyStakingCelo } from './beefy/beefy.staking.celo';
import { BeefyStakingCro } from './beefy/beefy.staking.cro';
import { BeefyStakingFtm } from './beefy/beefy.staking.ftm';
import { BeefyStakingMoonRiver } from './beefy/beefy.staking.mriver';
import { BeefyStakingOne } from './beefy/beefy.staking.one';
import { BeefyStakingPlg } from './beefy/beefy.staking.plg';
import { CurvePools } from './curve/curve.pools';
import { DefiKingdomsPools } from './defikingdoms/defikingdoms.pools';
import { DefiKingdomsStaking } from './defikingdoms/defikingdoms.staking';
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
import { ViperswapPools } from './viperswap/viperswap.pools';
import { ViperswapStaking } from './viperswap/viperswap.staking';

@Injectable()
export class JobsRegistry {
  public readonly registry: Map<string, JobInterface> = new Map<string, JobInterface>();

  constructor(
    autofarmStakingBSC: AutofarmStakingBSC,
    autofarmStakingPLG: AutofarmStakingPLG,
    badgerStakingArbi: BadgerStakingArbi,
    badgerStakingEth: BadgerStakingEth,
    badgerStakingPLG: BadgerStakingPLG,
    beefyStakingFtm: BeefyStakingFtm,
    beefyStakingBsc: BeefyStakingBsc,
    beefyStakingAvax: BeefyStakingAvax,
    beefyStakingCelo: BeefyStakingCelo,
    beefyStakingArbi: BeefyStakingArbi,
    beefyStakingOne: BeefyStakingOne,
    beefyStakingPlg: BeefyStakingPlg,
    beefyStakingCro: BeefyStakingCro,
    beefyStakingMoonRiver: BeefyStakingMoonRiver,
    curvePools: CurvePools,
    defiKingdomsPools: DefiKingdomsPools,
    defiKingdomsStaking: DefiKingdomsStaking,
    ellipsisLp: EllipsisLp,
    ellipsisStaking: EllipsisStaking,
    pancakeLPV2: PancakePoolsV2,
    pancakeStaking: PancakeStaking,
    raydiumStaking: RaydiumStaking,
    raydiymPools: RaydiumPools,
    spookyswapLp: SpookyswapPools,
    traderjoeLp: TraderjoePools,
    traderjoeStaking: TraderJoeStaking,
    viperswapPools: ViperswapPools,
    viperswapStaking: ViperswapStaking,
  ) {
    // this.register(curvePools); // TODO: temp disabled
    this.register(autofarmStakingBSC);
    this.register(autofarmStakingPLG);
    this.register(badgerStakingArbi);
    this.register(badgerStakingEth);
    this.register(badgerStakingPLG);
    this.register(beefyStakingArbi);
    this.register(beefyStakingAvax);
    this.register(beefyStakingBsc);
    this.register(beefyStakingCelo);
    this.register(beefyStakingCro);
    this.register(beefyStakingFtm);
    this.register(beefyStakingMoonRiver);
    this.register(beefyStakingOne);
    this.register(beefyStakingPlg);
    this.register(defiKingdomsPools);
    this.register(defiKingdomsStaking);
    this.register(ellipsisLp);
    this.register(ellipsisStaking);
    this.register(pancakeLPV2);
    this.register(pancakeStaking);
    this.register(raydiumStaking);
    this.register(raydiymPools);
    this.register(spookyswapLp);
    this.register(traderjoeLp);
    this.register(traderjoeStaking);
    this.register(viperswapPools);
    this.register(viperswapStaking);
  }

  private register(job: JobInterface) {
    this.registry.set(job.placeholder, job);
  }
}
