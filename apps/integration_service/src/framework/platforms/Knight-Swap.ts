import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import { IMasterChefMeta, MasterChef } from '../support/evm/protocols/yield/master-chef';
import { RootPlatform } from '../support/root-platform';

export class KnightSwap extends RootPlatform {
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
        discord: 'https://discord.com/invite/pvM2k-qzv4C',
        telegram: 'https://twitter.com/knight-ecosystem',
        twitter: 'https://twitter.com/knight-ecosystem',
        url: 'https://app.knightswap.financial/',
        github: 'https://github.com/knightswap',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0xE50cb76A71b0c52Ab091860cD61b9BA2FA407414',
    });
  }
}
