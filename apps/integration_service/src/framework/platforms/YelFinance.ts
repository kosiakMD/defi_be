import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { IMasterChefMeta } from '../support/EVM/protocols/Yield/MasterChef';
import { MasterChefYel } from '../support/EVM/protocols/Yield/MasterChefYel';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

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
      slug: this.constructor.name,
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
