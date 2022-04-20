import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { BalancerLiquidity } from '../support/EVM/protocols/Liquidity/BalancerLiquidity';
import { BalancerStaking } from '../support/EVM/protocols/Yield/BalancerStaking';
import { RootPlatform } from '../support/RootPlatform';

export class BalancerV2 extends RootPlatform {
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
    });

    await this.registerProtocol(BalancerLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Liquidity - Balancer',
      feature: FeatureEnum.pools,
      context: {
        key: 'balancer-v2',
      },
    });
    await this.registerProtocol(BalancerStaking, {
      chain: ChainIdEnum.eth,
      name: 'Staking - Balancer',
      feature: FeatureEnum.staking,
      context: {
        key: 'balancer-v2',
      },
    });

    await this.registerProtocol(BalancerLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Liquidity - Balancer',
      feature: FeatureEnum.pools,
      context: {
        key: 'balancer-polygon-v2',
      },
    });

    await this.registerProtocol(BalancerLiquidity, {
      chain: ChainIdEnum.arbi,
      name: 'Liquidity - Balancer',
      feature: FeatureEnum.pools,
      context: {
        key: 'balancer-arbitrum-v2',
      },
    });
  }
}
