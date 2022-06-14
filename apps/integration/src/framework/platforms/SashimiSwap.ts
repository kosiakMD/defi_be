import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  IUniswapVaultMeta,
  UniswapV2Liquidity,
} from '../support/EVM/protocols/Liquidity/UniswapV2Liquidity';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class SashimiSwap extends RootPlatform {
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
        url: 'https://sashimi.cool/',
        logo: 'https://sashimi.cool/static/media/logo.f923b0c4.svg',
      },
    });

    // await this.registerProtocol<IMasterChefMeta>(MasterChef, {
    //   chain: ChainIdEnum.eth,
    //   name: 'Farms - Sashimi',
    //   feature: FeatureEnum.staking,
    //   address: '0x9083ea3756bde6ee6f27a6e996806fbd37f6f093',
    // });

    await this.registerProtocol<IUniswapVaultMeta>(UniswapV2Liquidity, {
      chain: ChainIdEnum.eth,
      name: 'Liquidity - SashimiSwap',
      feature: FeatureEnum.pools,
      ammSubgraphUrl: 'https://api.thegraph.com/subgraphs/name/sashimiproject/sashimi-v2-fix',
    });
  }
}
