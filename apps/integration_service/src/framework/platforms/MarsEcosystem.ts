import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { IMasterChefMeta, MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class MarsEcosystem extends RootPlatform {
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
        discord: 'https://discord.com/invite/wybD8K27eZ',
        telegram: 'https://t.me/mars_ecosystem',
        twitter: 'https://twitter.com/MarsEcosystem',
        url: 'https://app.marsecosystem.com/',
        github: 'https://github.com/MarsEcosystem',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0xc7b8285a9e099e8c21ca5516d23348d8dbadde4a',
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x48c42579d98aa768cde893f8214371ed607cabe3',
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0xA53b575F9eC7126ba7b43c8c3171Fe4685F2f8b0',
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x4639d936f0a716f234ead073362c5cb272cc4b70',
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x22D8d50454203bd5a41B49ef515891f1aD9f3e53',
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x3a003E18124CFFf65c14cb111893aFF4e89b3814',
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x56B91eBaeb450CE27a3C4a41D9bf16162dD63eA2',
    });
  }
}
