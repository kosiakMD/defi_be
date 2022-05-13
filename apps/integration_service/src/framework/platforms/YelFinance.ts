import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { MasterChefYel } from '../support/EVM/protocols/Yield/MasterChefYel';
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

export class YelFinance extends RootPlatform {
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
        discord: 'https://discord.com/invite/yield-enhancement-labs',
        telegram: 'https://t.me/yelfinance',
        twitter: 'https://twitter.com/yel_finance',
        url: 'https://yel.finance/',
        github: 'https://github.com/YieldEnhancementLabs',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChefYel, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x954b15065e4fa1243cd45a020766511b68ea9b6e',
    });
  }
}
