import { Injectable } from '@nestjs/common';

import { JobInterface } from './job.interface';
import { PancakeStaking } from './pancake/pancake.staking';

@Injectable()
export class JobsRegistry {
  public readonly registry: Map<string, JobInterface> = new Map<string, JobInterface>();

  constructor(pancakeStaking: PancakeStaking) {
    this.registry.set(pancakeStaking.placeholder, pancakeStaking);
  }
}
