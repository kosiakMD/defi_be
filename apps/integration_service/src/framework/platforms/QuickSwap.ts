import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { StakingDualRewards } from '../support/EVM/protocols/Yield/StakingDualRewards';
import { StakingRewards } from '../support/EVM/protocols/Yield/StakingRewards';
import { RootPlatform } from '../support/RootPlatform';

export class QuickSwap extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register() {
    this.registerMeta({
      name: this.constructor.name,
      project: this.constructor.name,
      links: {
        url: 'https://quickswap.exchange/',
        logo: 'https://icons.llama.fi/quickswap.jpg',
        twitter: 'QuickswapDEX',
      },
    });

    const quickSwapPoolsEndpoint =
      'https://raw.githubusercontent.com/QuickSwap/interface-v2/master/src/constants/stake.json';

    // Good test account: 0x747276019e3340104c96397bf6537ad01f93d7df

    await this.registerProtocol(StakingRewards, {
      chain: ChainIdEnum.plg,
      name: 'Syrup',
      feature: FeatureEnum.staking,
      address: '0xAf94537FB2499276a87870B7328CC21e9bEB2BB0', // Randomly chosen vault to fetch ABI from
      api: {
        endpoint: quickSwapPoolsEndpoint,
        // see: https://www.npmjs.com/package/jsonpath-plus
        // reduce to an array of contract addresses
        // demo here: https://jsonpath-plus.github.io/JSONPath/demo/
        // path: '$.[veryoldstakingrewards].*.stakingRewardAddress',
        // path: '$.[syrup,oldsyrup,stakingrewards,oldstakingrewards,veryoldstakingrewards].*.stakingRewardAddress',
        path: '$.[?(@property !== "dualrewards")].*.stakingRewardAddress',
      },
    });

    await this.registerProtocol(StakingDualRewards, {
      chain: ChainIdEnum.plg,
      name: 'Dual Rewards',
      feature: FeatureEnum.staking,
      address: '0x3c1f53fed2238176419F8f897aEc8791C499e3c8', // Randomly chosen vault to fetch ABI from
      api: {
        endpoint: quickSwapPoolsEndpoint,
        path: '$.[dualrewards].*.stakingRewardAddress',
      },
    });
  }
}
