import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  BlueshiftLiquidity,
  IBlueshiftMeta,
} from '../support/EVM/protocols/Liquidity/BlueshiftLiquidity';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Blueshift extends RootPlatform {
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
        url: 'https://app.blueshift.fi/',
        logo: 'https://app.blueshift.fi/favicon.ico',
        twitter: 'blueshiftfi',
        github: 'blueshift-fi',
        telegram: 'BlueshiftGroup',
      },
    });

    await this.registerProtocol<IBlueshiftMeta>(BlueshiftLiquidity, {
      chain: ChainIdEnum.milkomeda,
      name: 'Blueshift - Portfolios',
      feature: FeatureEnum.staking,
      address: '0x83e384d119ada05195caca26396b8f56fdda1c91',
    });
  }
}
