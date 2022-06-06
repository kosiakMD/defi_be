import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { BenqiLending, IBenqiMeta } from '../support/EVM/protocols/Lending/BenqiLending';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Benqi extends RootPlatform {
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
        url: 'https://benqi.fi/',
        logo: 'https://icons.llama.fi/benqi.jpg',
        twitter: 'BenqiFinance',
      },
    });

    await this.registerProtocol<IBenqiMeta>(BenqiLending, {
      chain: ChainIdEnum.avax,
      name: 'Lending - Benqi',
      feature: FeatureEnum.lending,
      address: '0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4',
      market: '0x835866d37afb8cb8f8334dccdaf66cf01832ff5d',
      avax: '0x0000000000000000000000000000000000000000',
      qi: '0x8729438eb15e2c8b576fcc6aecda6a148776c0f5',
      context: {},
    });
  }
}
