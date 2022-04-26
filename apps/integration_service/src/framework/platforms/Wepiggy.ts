import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { RootPlatform } from '../support/RootPlatform';

// import { MasterChefWePiggy } from '../support/EVM/protocols/Yield/MasterChefWePiggy';

export class Wepiggy extends RootPlatform {
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
