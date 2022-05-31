import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import { IronBankLending, IronBankMeta } from '../support/evm/protocols/lending/iron-bank-lending';
import { RootPlatform } from '../support/root-platform';

export class IronBank extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  get endpoint(): string {
    return 'https://api.ib.xyz/api/v1/';
  }

  async register() {
    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://app.ib.xyz/',
        logo: 'https://icons.llama.fi/iron-bank.svg',
        twitter: 'https://twitter.com/ibdotxyz',
      },
    });

    await this.registerProtocol<IronBankMeta>(IronBankLending, {
      chain: ChainIdEnum.eth,
      name: 'Iron Bank Lending',
      feature: FeatureEnum.lending,
      apiEndpoint: this.endpoint,
    });

    await this.registerProtocol<IronBankMeta>(IronBankLending, {
      chain: ChainIdEnum.avax,
      name: 'Iron Bank Lending',
      feature: FeatureEnum.lending,
      apiEndpoint: this.endpoint,
    });

    await this.registerProtocol<IronBankMeta>(IronBankLending, {
      chain: ChainIdEnum.ftm,
      name: 'Iron Bank Lending',
      feature: FeatureEnum.lending,
      apiEndpoint: this.endpoint,
    });
  }
}
