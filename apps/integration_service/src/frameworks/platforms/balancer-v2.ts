import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import {
  BalancerLiquidity,
  IBalancerPoolMeta,
} from '../support/evm/protocols/liquidity/balancer-liquidity';
import {
  BalancerStaking,
  IBalancerVaultMeta,
} from '../support/evm/protocols/yield/balancer-staking';
import { RootPlatform } from '../support/root-platform';

export class BalancerV2 extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  get endpoint(): string {
    return 'https://api.thegraph.com/subgraphs/name/balancer-labs/';
  }

  async register() {
    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://balancer.finance/',
        logo: 'https://icons.llama.fi/balancer.png',
        twitter: 'BalancerLabs',
      },
    });

    await this.registerProtocol<IBalancerPoolMeta>(BalancerLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Liquidity - Balancer',
      feature: FeatureEnum.pools,
      context: {
        endpoint: this.endpoint,
        networkId: 'balancer-v2',
      },
    });
    await this.registerProtocol<IBalancerPoolMeta>(BalancerLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Liquidity - Balancer',
      feature: FeatureEnum.pools,
      context: {
        endpoint: this.endpoint,
        networkId: 'balancer-polygon-v2',
      },
    });

    await this.registerProtocol<IBalancerPoolMeta>(BalancerLiquidity, {
      chain: ChainIdEnum.arbi,
      name: 'Liquidity - Balancer',
      feature: FeatureEnum.pools,
      context: {
        endpoint: this.endpoint,
        networkId: 'balancer-arbitrum-v2',
      },
    });

    await this.registerProtocol<IBalancerVaultMeta>(BalancerStaking, {
      chain: ChainIdEnum.eth,
      name: 'Staking - Balancer',
      feature: FeatureEnum.staking,
      context: {
        endpoint: this.endpoint,
        networkId: 'balancer-v2',
        gaugesId: 'balancer-gauges',
      },
    });

    await this.registerProtocol<IBalancerVaultMeta>(BalancerStaking, {
      chain: ChainIdEnum.plg,
      name: 'Staking - Balancer',
      feature: FeatureEnum.staking,
      context: {
        endpoint: this.endpoint,
        networkId: 'balancer-polygon-v2',
        gaugesId: 'balancer-gauges-polygon',
      },
    });

    await this.registerProtocol<IBalancerVaultMeta>(BalancerStaking, {
      chain: ChainIdEnum.arbi,
      name: 'Staking - Balancer',
      feature: FeatureEnum.staking,
      context: {
        endpoint: this.endpoint,
        networkId: 'balancer-arbitrum-v2',
        gaugesId: 'balancer-gauges-arbitrum',
      },
    });
  }
}
