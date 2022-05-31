import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import { IMasterChefMeta } from '../support/evm/protocols/yield/master-chef';
import { MasterChefMdex } from '../support/evm/protocols/yield/master-chef-mdex';
import { RootPlatform } from '../support/root-platform';

export class Mdex extends RootPlatform {
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
        discord: 'https://discord.com/invite/3TYDPktjq-c',
        telegram: 'https://t.me/mdex-eN',
        twitter: 'https://twitter.com/mdextech',
        url: 'https://mdex.com/',
        github: 'https://github.com/mdex-swap',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChefMdex, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0xc48FE252Aa631017dF253578B1405ea399728A50',
    });
  }
}
