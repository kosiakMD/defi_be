import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  IMinSwapPoolsMeta,
  MinSwapStaking,
} from '../support/Cardano/protocols/Yield/MinSwapStaking';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class MinSwap extends RootPlatform {
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
        twitter: 'https://twitter.com/MuesliSwapTeam',
        telegram: 'https://t.me/muesliswapADA',
        url: 'https://www.muesliswap.com/',
        logo: 'https://2891243240-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MjoGoMS0wqMF7Accm3h%2Ficon%2F494cdRSp1ekeTJJgMFlv%2FIcon.png?alt=media',
      },
    });

    await this.registerProtocol<IMinSwapPoolsMeta>(MinSwapStaking, {
      chain: ChainIdEnum.cardano,
      name: 'MuesliSwap',
      feature: FeatureEnum.staking,
      context: {
        endpoint: 'https://monorepo-mainnet-prod.minswap.org/graphql',
      },
    });
  }
}
