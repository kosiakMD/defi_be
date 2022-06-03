import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { UniswapV2Liquidity } from '../support/EVM/protocols/Liquidity/UniswapV2Liquidity';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Swapr extends RootPlatform {
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
        url: 'https://swapr.eth.link/',
        logo: 'https://swapr.eth.link/static/media/swapr_white_no_badge.svg',
      },
    });

    await this.registerProtocol(UniswapV2Liquidity, {
      chain: ChainIdEnum.eth,
      name: 'Liquidity - Swapr',
      feature: FeatureEnum.pools,
      ammSubgraphUrl: 'https://api.thegraph.com/subgraphs/name/dxgraphs/swapr-mainnet-v2',
    });
  }
}
