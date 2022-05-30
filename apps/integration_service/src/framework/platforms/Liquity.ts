import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  ILiquityStabilityPoolMeta,
  LiquityStabilityPool,
} from '../support/EVM/protocols/Yield/LiquityStabilityPool';
import { ILiquityStakingMeta, LiquityStaking } from '../support/EVM/protocols/Yield/LiquityStaking';
// import { LiquityTrove } from '../support/EVM/protocols/Lending/LiquityTrove';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Liquity extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register(): Promise<void> {
    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://www.liquity.org/',
        logo: 'https://icons.llama.fi/liquity.jpg',
        twitter: 'https://twitter.com/LiquityProtocol',
        discord: 'https://discord.com/invite/2up5U32',
      },
    });

    /**
     * Test Address: 0x854e3e0c05853d1dc9507e36f75e5426a392ea0c
     * Test Address: 0x1a2da291ebf35d05d29c2753998bfe847e8f5104
     */

    // await this.registerProtocol<ILiquityTroveMeta>(LiquityTrove, {
    //   chain: ChainIdEnum.eth,
    //   name: 'Liquity Trove',
    //   feature: FeatureEnum.lending,
    // });

    await this.registerProtocol<ILiquityStabilityPoolMeta>(LiquityStabilityPool, {
      chain: ChainIdEnum.eth,
      name: 'Liquity Stability Pools',
      feature: FeatureEnum.staking,
      address: '0x66017d22b0f8556afdd19fc67041899eb65a21bb',
      context: {
        rewardToken: '0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D', // LQTY
      },
    });

    await this.registerProtocol<ILiquityStakingMeta>(LiquityStaking, {
      chain: ChainIdEnum.eth,
      name: 'LQTY Staking',
      feature: FeatureEnum.staking,
      address: '0x4f9fbb3f1e99b56e0fe2892e623ed36a76fc605d',
    });

    // await this.registerProtocol<ILiquityMeta>(LiquityTrove, {
    //   chain: ChainIdEnum.ftm,
    //   name: 'Liquity Trove',
    //   feature: FeatureEnum.lending,
    // });
  }
}
