import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { UniswapV2Liquidity } from '../support/EVM/protocols/Liquidity/UniswapV2Liquidity';
import { RootPlatform } from '../support/RootPlatform';

export class Mojitoswap extends RootPlatform {
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
        url: 'https://www.mojitoswap.finance/',
        logo: 'https://www.mojitoswap.finance/favicon.png',
      },
    });

    await this.registerProtocol(UniswapV2Liquidity, {
      chain: ChainIdEnum.kcc,
      name: 'Liquidity - Mojitoswap',
      feature: FeatureEnum.pools,
      ammSubgraphUrl: 'https://thegraph.kcc.network/subgraphs/name/mojito/swap',
    });
  }
}
