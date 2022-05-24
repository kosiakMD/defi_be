import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { RootPlatform } from '../support/RootPlatform';

// import { MasterChefWePiggy } from '../support/EVM/protocols/Yield/MasterChefWePiggy';

export class WePiggy extends RootPlatform {
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
        url: 'https://www.wepiggy.com/',
        logo: 'https://icons.llama.fi/wepiggy.png',
        twitter: 'wepiggydotcom',
      },
    });

    // await this.registerProtocol(MasterChefWePiggy, {
    //   chain: ChainIdEnum.arbi,
    //   name: 'Farms - Masterchef',
    //   feature: FeatureEnum.staking,
    //   address: '0x2069043d7556B1207a505eb459D18d908DF29b55',
    //   context: {
    //     badPools: [0],
    //   },
    // });
  }
}
