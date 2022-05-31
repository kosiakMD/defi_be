import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import { IMasterChefMeta, MasterChef } from '../support/evm/protocols/yield/master-chef';
import { RootPlatform } from '../support/root-platform';

export class ApeSwap extends RootPlatform {
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
        url: 'https://apeswap.finance',
        logo: 'https://icons.llama.fi/apeswap.svg',
        twitter: 'ape_swap',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms - Masterchef',
      feature: FeatureEnum.staking,
      address: '0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9',
    });

    // subgraph is not working
    // await this.registerProtocol(UniswapV2Liquidity, {
    //   chain: ChainIdEnum.bnb,
    //   name: 'Liquidity - ApeSwap',
    //   feature: FeatureEnum.pools,
    //   ammSubgraphUrl: 'https://graph.apeswap.finance/subgraphs/name/ape-swap/apeswap-subgraph',
    // });
  }
}
