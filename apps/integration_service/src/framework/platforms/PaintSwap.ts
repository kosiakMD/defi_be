import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { RootPlatform } from '../support/RootPlatform';

export class PaintSwap extends RootPlatform {
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
        url: 'https://paintswap.finance',
        logo: 'https://icons.llama.fi/paint-swap.png',
        twitter: 'paint_swap',
      },
    });

    // Single Staking
    await this.registerProtocol(MasterChef, {
      chain: ChainIdEnum.ftm,
      name: 'Decorator',
      feature: FeatureEnum.staking,
      address: '0xCb80F529724B9620145230A0C866AC2FACBE4e3D',
    });
  }
}
