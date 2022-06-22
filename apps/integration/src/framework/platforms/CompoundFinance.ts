import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  CompoundFinanceLending,
  ICompoundFinanceMeta,
} from '../support/EVM/protocols/Lending/CompoundFinanceLending';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class CompoundFinance extends RootPlatform {
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
        twitter: 'https://twitter.com/compoundfinance',
        url: 'https://compound.finance/',
        github: 'https://github.com/compound-finance',
        discord: 'https://discord.com/invite/fq6JSPkpJn',
      },
    });

    await this.registerProtocol<ICompoundFinanceMeta>(CompoundFinanceLending, {
      chain: ChainIdEnum.eth,
      name: 'CompoundLens',
      feature: FeatureEnum.lending,
      address: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
      context: {
        endpoint: 'https://api.compound.finance/api/v2/',
      },
    });
  }
}
