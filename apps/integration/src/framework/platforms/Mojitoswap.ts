import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  IUniswapVaultMeta,
  UniswapV2Liquidity,
} from '../support/EVM/protocols/Liquidity/UniswapV2Liquidity';
import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { MojitoVault } from '../support/EVM/protocols/Yield/MojitoVault';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

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

    await this.registerProtocol<IUniswapVaultMeta>(UniswapV2Liquidity, {
      chain: ChainIdEnum.kcc,
      name: 'Liquidity - Mojitoswap',
      feature: FeatureEnum.pools,
      ammSubgraphUrl: 'https://thegraph.kcc.network/subgraphs/name/mojito/swap',
    });

    await this.registerProtocol(MasterChef, {
      chain: ChainIdEnum.kcc,
      name: 'Wine Pool Manual - Mojitoswap',
      feature: FeatureEnum.staking,
      address: '0xfdfce767add9dcf032cbd0de35f0e57b04495324',
    });

    await this.registerProtocol(MojitoVault, {
      chain: ChainIdEnum.kcc,
      name: 'Wine Pool Auto - Mojitoswap',
      feature: FeatureEnum.staking,
      address: '0x3db85383ab912c9d9c003bd2ec09107e0f37b8a0',
    });
  }
}
