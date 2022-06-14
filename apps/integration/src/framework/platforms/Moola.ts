import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { AaveV2Lending, IAaveV2Meta } from '../support/EVM/protocols/Lending/AaveV2Lending';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Moola extends RootPlatform {
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
        url: 'https://nereus.finance/',
        logo: 'https://icons.llama.fi/nereus-finance.png',
        twitter: 'https://twitter.com/nereusfinance',
      },
    });

    await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
      chain: ChainIdEnum.celo,
      name: 'Lending - Moola',
      feature: FeatureEnum.lending,
      address: '0x970b12522CA9b4054807a2c5B736149a5BE6f670',
    });
  }
}
