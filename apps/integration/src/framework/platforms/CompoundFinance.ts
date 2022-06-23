import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  ICompoundFinanceClaimableMeta,
  CompoundFinanceClaimable,
} from '../support/EVM/protocols/Claimable/CompoundFinanceClaimable';
import {
  CompoundController,
  ICompoundControllerMeta,
} from '../support/EVM/protocols/Lending/CompoundController';
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

    await this.registerProtocol<ICompoundControllerMeta>(CompoundController, {
      chain: ChainIdEnum.eth,
      name: 'Unitroller',
      feature: FeatureEnum.lending,
      address: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
      context: {
        cToken: '0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e',
        nativeToken: '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5', // eth
      },
    });

    await this.registerProtocol<ICompoundFinanceClaimableMeta>(CompoundFinanceClaimable, {
      chain: ChainIdEnum.eth,
      name: 'CompoundLens',
      feature: FeatureEnum.claimable,
      address: '0xA6c8D1c55951e8AC44a0EaA959Be5Fd21cc07531',
      context: {
        controller: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
        rewardToken: '0xc00e94cb662c3520282e6f5717214004a7f26888',
      },
    });
  }
}
