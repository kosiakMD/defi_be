import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { AaveV2Lending, IAaveV2Meta } from '../support/EVM/protocols/Lending/AaveV2Lending';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Geist extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register(): Promise<void> {
    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://geist.finance/markets',
        logo: 'https://icons.llama.fi/geist-finance.jpg',
        telegram: 'https://t.me/geist_finance',
        discord: 'https://discord.com/invite/b6cXdZRNSK',
        twitter: 'https://twitter.com/GeistFinance',
      },
    });

    await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
      chain: ChainIdEnum.ftm,
      name: 'Lending - Blizz',
      feature: FeatureEnum.lending,
      address: '0x9FAD24f572045c7869117160A571B2e50b10d068',
    });
  }
}
