import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { SyntetixLending } from '../support/EVM/protocols/Lending/SyntetixLending';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Syntetix extends RootPlatform {
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
        url: 'https://staking.synthetix.io/',
        logo: 'https://synthetix.io/logo-x.svg',
        twitter: 'https://twitter.com/synthetix_io',
        github: 'https://github.com/synthetixio',
        discord: 'https://discord.com/invite/AEdUHzt',
      },
    });

    // need to exclude from balances:
    // ETH: 0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f
    // OP: 0x8700daec35af8ff88c16bdf0418774cb3d7599b4

    // 0xde910777c787903f78c89e7a0bf7f4c435cbb1fe test address
    await this.registerProtocol(SyntetixLending, {
      chain: ChainIdEnum.eth,
      name: 'SYntetix',
      feature: FeatureEnum.lending,
      address: '0x08f30ecf2c15a783083ab9d5b9211c22388d0564',
      // syntetix stable token which is debt token, no easy way to get it dynamically
      stable: '0x57ab1ec28d129707052df4df418d58a2d46d5f51',
    });

    // 0x2ce1a66f22a2dc6e410d9021d57aeb8d13d6bfef test address
    // 0x28522ed1adc427d2b71c645644300a414afa7b1f test address
    await this.registerProtocol(SyntetixLending, {
      chain: ChainIdEnum.opt,
      name: 'SYntetix',
      feature: FeatureEnum.lending,
      address: '0xfe8e48bf36ccc3254081ec8c65965d1c8b2e744d',
      // syntetix stable token which is debt token, no easy way to get it dynamically
      stable: '0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9',
    });
  }
}
