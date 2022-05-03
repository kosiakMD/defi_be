import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

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
      name: 'Tomb Finance',
      project: this.constructor.name,
      links: {
        url: 'https://tomb.finance/',
        logo: 'https://icons.llama.fi/tomb-finance.jpg',
        twitter: 'tombfinance',
      },
    });

    // TODO: Add algo stable (boardroom)
    // await this.registerProtocol(AlgoStable, {
    //     chain: ChainIdEnum.ftm,
    //     name: 'Masonry',
    //     feature: FeatureEnum.staking,
    //     address: '0x8764DE60236C5843D9faEB1B638fbCE962773B67',
    //     data: {
    //         share: '0x4cdf39285d7ca8eb3f090fda0c069ba5f4145b37',
    //         reward: '0x6c021ae822bea943b2e66552bde1d2696a53fbb7'
    //     },
    //   });

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
