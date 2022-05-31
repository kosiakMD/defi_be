import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import { MasterBelt } from '../support/evm/protocols/yield/master-belt';
import { IProtocolMeta } from '../support/interfaces';
import { RootPlatform } from '../support/root-platform';

interface IMasterChefMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  name: string; // Genesis, Farm, AceLab
  context?: {
    badPools?: number[]; // poolIds to skip
    [key: string]: any;
  };
}

export class Belt extends RootPlatform {
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
        telegram: 'https://t.me/belt-finance',
        twitter: 'https://twitter.com/bELT_Finance',
        url: 'https://belt.fi/',
        github: 'https://github.com/belt-fi/',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterBelt, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0xd4bbc80b9b102b77b21a06cb77e954049605e6c1',
    });
  }
}
