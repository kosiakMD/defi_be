import { Injectable } from '@nestjs/common';

import { JobInterface } from './job.interface';
import { PancakeLpV2 } from './pancake/pancake.lp.v2';
import { PancakeStaking } from './pancake/pancake.staking';
import { TraderjoeLp } from './traderjoe/traderjoe.lp';
import { TraderJoeStaking } from './traderjoe/traderjoe.staking';
import { EllipsisLp } from './ellipsis/ellipsis.lp';

@Injectable()
export class JobsRegistry {
  public readonly registry: Map<string, JobInterface> = new Map<string, JobInterface>();

  constructor(
    ellipsisLp: EllipsisLp,
    // pancakeStaking: PancakeStaking,
    // pancakeLPV2: PancakeLpV2,
    // traderjoeLp: TraderjoeLp,
    // traderjoeStaking: TraderJoeStaking,
  ) {
    this.registry.set(ellipsisLp.placeholder, ellipsisLp);
    // this.registry.set(pancakeStaking.placeholder, pancakeStaking);
    // this.registry.set(pancakeLPV2.placeholder, pancakeLPV2);
    // this.registry.set(traderjoeLp.placeholder, traderjoeLp);
    // this.registry.set(traderjoeStaking.placeholder, traderjoeStaking);
  }
}
