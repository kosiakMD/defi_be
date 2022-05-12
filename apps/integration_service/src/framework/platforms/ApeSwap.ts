import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { UniswapV2Liquidity } from '../support/EVM/protocols/Liquidity/UniswapV2Liquidity';
import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { RootPlatform } from '../support/RootPlatform';

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
      project: this.constructor.name,
      links: {
        url: 'https://apeswap.finance',
        logo: 'https://icons.llama.fi/apeswap.svg',
        twitter: 'ape_swap',
      },
    });

    await this.registerProtocol(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms - Masterchef',
      feature: FeatureEnum.staking,
      address: '0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9',
    });

    await this.registerProtocol(UniswapV2Liquidity, {
      chain: ChainIdEnum.bnb,
      name: 'Liquidity - ApeSwap',
      feature: FeatureEnum.pools,
      ammSubgraphUrl: 'https://graph.apeswap.finance/subgraphs/name/ape-swap/apeswap-subgraph',
    });
  }
}
