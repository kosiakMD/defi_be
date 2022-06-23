import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  IMinSwapPoolsMeta,
  MinSwapLiquidity,
} from '../support/Cardano/protocols/Liquidity/MinSwapLiquidity';
import {
  IMinSwapStakingLockingMeta,
  MinSwapStakingLocking,
} from '../support/Cardano/protocols/Locked/MinSwapStakingLocking';
import {
  IMinSwapStakingMeta,
  MinSwapStaking,
} from '../support/Cardano/protocols/Yield/MinSwapStaking';
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
        twitter: 'https://twitter.com/MinswapDEX',
        telegram: 'https://t.me/MinswapMafia',
        url: 'https://minswap.org/',
        logo: 'https://icons.llama.fi/minswap.png',
      },
    });

    await this.registerProtocol<IMinSwapStakingMeta>(MinSwapStaking, {
      chain: ChainIdEnum.cardano,
      name: 'MinSwapStaking',
      feature: FeatureEnum.staking,
      context: {
        endpoint: 'https://monorepo-mainnet-prod.minswap.org/graphql',
        rewardedToken: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6.4d494e',
      },
    });

    await this.registerProtocol<IMinSwapStakingLockingMeta>(MinSwapStakingLocking, {
      chain: ChainIdEnum.cardano,
      name: 'MinSwapStaking',
      feature: FeatureEnum.staking,
      context: {
        endpoint: 'https://monorepo-mainnet-prod.minswap.org/graphql',
        mintStakingToken: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6.4d494e74', // mint
        rewardedToken: '29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6.4d494e', // min
      },
    });

    await this.registerProtocol<IMinSwapPoolsMeta>(MinSwapLiquidity, {
      chain: ChainIdEnum.cardano,
      name: 'MinSwapPools',
      feature: FeatureEnum.pools,
      context: {
        endpoint: 'https://monorepo-mainnet-prod.minswap.org/graphql',
      },
    });
  }
}
