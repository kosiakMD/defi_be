import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  CompoundController,
  ICompoundControllerMeta,
} from '../support/EVM/protocols/Lending/CompoundController';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class CreamFinance extends RootPlatform {
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

    await this.registerProtocol<ICompoundControllerMeta>(CompoundController, {
      chain: ChainIdEnum.bnb,
      name: 'Unitroller',
      feature: FeatureEnum.lending,
      address: '0x589de0f0ccf905477646599bb3e5c622c84cc0ba',
      context: {
        cToken: '0x15cc701370cb8ada2a2b6f4226ec5cf6aa93bc67',
        nativeToken: '0x1ffe17b99b439be0afc831239ddecda2a790ff3a',
      }
    });
  }
}
