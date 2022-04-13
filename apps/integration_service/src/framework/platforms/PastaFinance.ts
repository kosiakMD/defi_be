import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { CakeVault } from '../support/EVM/protocols/Yield/CakeVault';
import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { StakingRewards } from '../support/EVM/protocols/Yield/StakingRewards';
import { RootPlatform } from '../support/RootPlatform';

export class PastaFinance extends RootPlatform {
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
      chain: ChainIdEnum.bnb,
      name: 'Farms - Masterchef',
      feature: FeatureEnum.staking,
      address: '0x60b1bc3b8f753758cab89d4603bf5c901dd16eb4',
    });
  }
}
