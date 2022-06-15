import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  BancorClaimable,
  IBancorClaimableMeta,
} from '../support/EVM/protocols/Claimable/BancorClaimable';
import {
  BancorSingleSideLiquidity,
  IBancorLiquidityMeta,
} from '../support/EVM/protocols/Liquidity/BancorSingleSideLiquidity';
import {
  BancorStakingV3,
  IBancorStakingMeta,
} from '../support/EVM/protocols/Yield/BancorStakingV3';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Bancor extends RootPlatform {
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
        telegram: 'https://t.me/bancor',
        twitter: 'https://twitter.com/Bancor',
        url: 'https://app.bancor.network/',
        github: 'https://github.com/bancorprotocol',
        discord: 'https://discord.com/invite/aMVTbrmgD7',
      },
    });

    await this.registerProtocol<IBancorStakingMeta>(BancorStakingV3, {
      chain: ChainIdEnum.eth,
      name: 'Bancor V3',
      feature: FeatureEnum.staking,
      address: '0xb0b958398abb0b5db4ce4d7598fb868f5a00f372',
      vault: '0x649765821d9f64198c905ec0b2b037a4a52bc373',
      info: '0x8e303d296851b320e6a697bacb979d13c9d6e760',
    });

    await this.registerProtocol<IBancorLiquidityMeta>(BancorSingleSideLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Bancor V2',
      feature: FeatureEnum.pools,
      minUSDLiquidity: 5000,
      address: '0xf5fab5dbd2f3bf675de4cb76517d4767013cfb55',
      poolsApi: 'https://api-v2.bancor.network/pools',
    });

    await this.registerProtocol<IBancorClaimableMeta>(BancorClaimable, {
      chain: ChainIdEnum.eth,
      name: 'Bancor V2',
      feature: FeatureEnum.claimable,
      address: '0x318fea7e45a7d3ac5999da7e1055f5982eeb3e67',
      reward: '0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c',
    });
  }
}
