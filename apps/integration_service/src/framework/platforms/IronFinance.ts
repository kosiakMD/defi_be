import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { CakeVault } from '../support/EVM/protocols/Yield/CakeVault';
import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { StakingRewards } from '../support/EVM/protocols/Yield/StakingRewards';
import { RootPlatform } from '../support/RootPlatform';
import { MasterChefIronFinance } from '../support/EVM/protocols/Yield/MasterChefIronFinance';

export class IronFinance extends RootPlatform {
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

    await this.registerProtocol(MasterChefIronFinance, {
      chain: ChainIdEnum.bnb,
      name: 'Farms - Masterchef',
      feature: FeatureEnum.staking,
      address: '0xC5a992dD7ba108e3349D2Fd8e8E126753Ca8Ce34',
    });
  }
}
