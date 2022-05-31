import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { IMasterChefMeta } from '../support/EVM/protocols/Yield/MasterChef';
import { MasterChefTreeDefi } from '../support/EVM/protocols/Yield/MasterChefTreeDefi';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class TreeDefi extends RootPlatform {
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
        url: 'https://treedefi.com',
        logo: 'https://icons.llama.fi/treedefi.png',
        twitter: 'treedefi',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChefTreeDefi, {
      chain: ChainIdEnum.bnb,
      name: 'Farms - Masterchef',
      feature: FeatureEnum.staking,
      address: '0xA9a438B8b2E41B3bf322DBA139aF9490DC226953',
    });
  }
}
