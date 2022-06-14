import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { RootPlatform } from '../support/RootPlatform';
import { ISolendingMeta, SoLending } from '../support/Solana/protocols/Lending/SoLending';
import { FeatureEnum } from '../support/enums';

export class Solend extends RootPlatform {
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
        url: 'https://solend.fi',
        logo: 'https://icons.llama.fi/solend.png',
        twitter: 'solendprotocol',
      },
    });

    await this.registerProtocol<ISolendingMeta>(SoLending, {
      chain: ChainIdEnum.sol,
      name: 'Solana Lending',
      feature: FeatureEnum.lending,
      baseApiUrl: 'https://api.solend.fi/v1',
      address: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo', //Program address
    });
  }
}
