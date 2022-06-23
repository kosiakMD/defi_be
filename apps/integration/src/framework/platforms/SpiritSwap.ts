import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { SpiritLiquidity } from '../support/EVM/protocols/Liquidity/SpiritLiquidity';
import { RootLocked } from '../support/EVM/protocols/Locked/RootLocked';
import { IMasterChefMeta, MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { SpiritStaking } from '../support/EVM/protocols/Yield/SpiritStaking';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class SpiritSwap extends RootPlatform {
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
        url: 'https://spiritswap.finance/',
        logo: 'https://spiritswap.finance/favicon.png',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.ftm,
      name: 'Farms - Masterchef - SpiritSwap',
      feature: FeatureEnum.staking,
      address: '0x9083ea3756bde6ee6f27a6e996806fbd37f6f093',
    });

    await this.registerProtocol(RootLocked, {
      chain: ChainIdEnum.ftm,
      name: 'Locked - SpiritSwap',
      feature: FeatureEnum.staking,
      address: '0x2FBFf41a9efAEAE77538bd63f1ea489494acdc08',
    });

    await this.registerProtocol(SpiritStaking, {
      chain: ChainIdEnum.ftm,
      name: 'Farms - SpiritSwap',
      feature: FeatureEnum.staking,
      address: '0x420b17f69618610DE18caCd1499460EFb29e1d8f',
      context: { rewardToken: '0x5cc61a78f164885776aa610fb0fe1257df78e59b' },
    });

    await this.registerProtocol(SpiritLiquidity, {
      chain: ChainIdEnum.ftm,
      name: 'Luquidity - SpiritSwap',
      feature: FeatureEnum.pools,
      address: '0xef45d134b73241eda7703fa787148d9c9f4950b0',
    });
  }
}
