import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { KyberLiquidity } from '../support/EVM/protocols/Liquidity/KyberLiquidity';
import { KyberStaking } from '../support/EVM/protocols/Yield/KyberStaking';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Kyberswap extends RootPlatform {
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
        url: 'https://kyberswap.com/',
        logo: 'https://kyberswap.com/favicon.png',
      },
    });

    await this.registerProtocol(KyberLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Luquidity - Kyberswap',
      feature: FeatureEnum.pools,
      address: '0x833e4083B7ae46CeA85695c4f7ed25CDAd8886dE',
    });

    await this.registerProtocol(KyberStaking, {
      chain: ChainIdEnum.eth,
      name: 'Farms - Kyberswap',
      feature: FeatureEnum.staking,
      address: '0xc0601973451d9369252Aee01397c0270CD2Ecd60',
      context: { rewardToken: '' },
    });
  }
}
