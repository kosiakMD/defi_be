import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { MasterChefAceLab } from '../support/EVM/protocols/Yield/MasterChefAceLab';
import { RootPlatform } from '../support/RootPlatform';

export class SpookySwap extends RootPlatform {
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

    await this.registerProtocol(MasterChef, {
      chain: ChainIdEnum.ftm,
      name: 'Farms', // not currently used. helps with debugging. might want to expose to user?
      feature: FeatureEnum.staking,
      address: '0x2b2929E785374c651a81A63878Ab22742656DcDd',
    });

    await this.registerProtocol(MasterChefAceLab, {
      chain: ChainIdEnum.ftm,
      name: 'AceLab',
      feature: FeatureEnum.staking,
      address: '0x2352b745561e7e6FCD03c093cE7220e3e126ace0',
    });
  }
}
