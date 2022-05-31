import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import { IMasterChefMeta, MasterChef } from '../support/evm/protocols/yield/master-chef';
import { RootPlatform } from '../support/root-platform';

export class CafeSwap extends RootPlatform {
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
        url: 'https://cafeswap.finance',
        logo: 'https://icons.llama.fi/cafeswap.png',
        twitter: 'CafeSwapFinance',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms - Masterchef',
      feature: FeatureEnum.staking,
      address: '0xc772955c33088a97D56d0BBf473d05267bC4feBB',
    });
  }
}
