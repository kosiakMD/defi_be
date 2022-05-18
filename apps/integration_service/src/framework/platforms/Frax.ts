import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { FraxStaking } from '../support/EVM/protocols/Yield/FraxStaking';
import { RootPlatform } from '../support/RootPlatform';

export class Frax extends RootPlatform {
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
    });

    await this.registerProtocol(FraxStaking, {
      chain: ChainIdEnum.eth,
      name: 'Farming - Frax',
      feature: FeatureEnum.staking,
      gaugeController: '0x3669C421b77340B2979d1A00a792CC2ee0FcE737',
      fxsStaking: '0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0',
      fxsReward: '0xc6764e58b36e26b08Fd1d2AeD4538c02171fA872',
      fxsToken: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
    });
  }
}
