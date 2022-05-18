import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { TombMasonry } from '../support/EVM/protocols/AlgoStable/TombMasonry';
import { MasterChefCemetary } from '../support/EVM/protocols/Yield/MasterChefCemetary';
import { RootPlatform } from '../support/RootPlatform';

export class TombFinance extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register() {
    this.registerMeta({
      name: this.constructor.name,
      project: this.constructor.name,
      links: {
        url: 'https://tomb.finance/',
        logo: 'https://icons.llama.fi/tomb-finance.jpg',
        twitter: 'tombfinance',
      },
    });

    await this.registerProtocol(TombMasonry, {
      chain: ChainIdEnum.ftm,
      name: 'Masonry',
      feature: FeatureEnum.staking,
      address: '0x8764DE60236C5843D9faEB1B638fbCE962773B67',
    });

    await this.registerProtocol(MasterChefCemetary, {
      chain: ChainIdEnum.ftm,
      name: 'Cemetary',
      feature: FeatureEnum.staking,
      address: '0xcc0a87F7e7c693042a9Cc703661F5060c80ACb43',
      context: {
        // TODO: unlikely to change/slow to change, however maybe we want to scrape the screen
        // to count the pools or something here?
        poolLength: 7,
      },
    });

    await this.registerProtocol(MasterChefCemetary, {
      chain: ChainIdEnum.ftm,
      name: 'Genesis',
      feature: FeatureEnum.staking,
      address: '0x9A896d3c54D7e45B558BD5fFf26bF1E8C031F93b',
      context: {
        poolLength: 5,
      },
    });
  }
}
