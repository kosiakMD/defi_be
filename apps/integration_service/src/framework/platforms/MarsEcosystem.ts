import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { RootPlatform } from '../support/RootPlatform';
import { IProtocolMeta } from '../support/interfaces';

interface IMasterChefMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  name: string; // Genesis, Farm, AceLab
  context?: {
    badPools?: number[]; // poolIds to skip
    [key: string]: any;
  };
}

export class MarsEcosystem extends RootPlatform {
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
      links: {
        discord: 'https://discord.com/invite/wybD8K27eZ',
        telegram: 'https://t.me/mars_ecosystem',
        twitter: 'https://twitter.com/MarsEcosystem',
        url: 'https://app.marsecosystem.com/',
        github: 'https://github.com/MarsEcosystem',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0xc7b8285a9e099e8c21ca5516d23348d8dbadde4a',
    });
  }
}
