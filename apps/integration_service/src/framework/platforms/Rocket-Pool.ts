import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';

import { FeatureEnum } from '../support/enums';
import {
  IRocketPoolStakingMeta,
  RocketPoolStaking,
} from '../support/evm/protocols/yield/rocket-pool-staking';
import { RootPlatform } from '../support/root-platform';

export class RocketPool extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register() {
    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://rocketpool.net/',
        logo: 'https://icons.llama.fi/rocket-pool.jpg',
        twitter: 'RocketPool',
      },
    });

    await this.registerProtocol<IRocketPoolStakingMeta>(RocketPoolStaking, {
      chain: ChainIdEnum.eth,
      name: 'RocketPool',
      feature: FeatureEnum.staking,
      address: '0xae78736cd615f374d3085123a210448e74fc6393',
      context: {
        /** @TODO is it safe to use address like this? */
        sourceAPR: 'https://stake.rocketpool.net/assets/index.3d9e3062.js',
        stakedToken: ZERO_ADDRESS,
      },
    });
  }
}
