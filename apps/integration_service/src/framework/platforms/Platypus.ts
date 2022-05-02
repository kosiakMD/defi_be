import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { PlatypusLiquidity } from '../support/EVM/protocols/Liquidity/PlatypusLiquidity';
import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { RootPlatform } from '../support/RootPlatform';

export class Platypus extends RootPlatform {
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

    await this.registerProtocol(PlatypusLiquidity, {
      chain: ChainIdEnum.avax,
      name: 'Liquidity Pool',
      feature: FeatureEnum.pools,
    });

    // await this.registerProtocol(MasterChef, {
    //   chain: ChainIdEnum.avax,
    //   name: 'Farms - Masterchef',
    //   feature: FeatureEnum.staking,
    //   address: '0x68c5f4374228BEEdFa078e77b5ed93C28a2f713E',
    // });
  }
}
