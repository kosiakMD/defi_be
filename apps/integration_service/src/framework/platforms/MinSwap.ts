import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  MinSwapLiquidity,
  MinSwapLiquidityMeta,
} from '../support/Cardano/protocols/Liquidity/MinSwapLiquidity';
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
        discord: '',
        telegram: '',
        twitter: '',
        url: '',
        github: '',
      },
    });

    await this.registerProtocol<MinSwapLiquidityMeta>(MinSwapLiquidity, {
      chain: ChainIdEnum.cardano,
      name: 'MinSwap - Liquidity',
      feature: FeatureEnum.pools,
      context: {
        endpoint: 'https://monorepo-mainnet-prod.minswap.org/graphql',
      },
    });
  }
}
