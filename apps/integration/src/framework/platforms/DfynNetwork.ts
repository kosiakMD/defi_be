import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { DfynNetworkVault } from '../support/EVM/protocols/Yield/DfynNetworkVault';
import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class DfynNetwork extends RootPlatform {
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
        url: 'https://exchange.dfyn.network/',
        logo: 'https://exchange.dfyn.network/static/media/DFYN%20logo%20final.7dbc97d3.png',
      },
    });

    await this.registerProtocol(MasterChef, {
      chain: ChainIdEnum.plg,
      name: 'factory',
      feature: FeatureEnum.pools,
      address: '0xE7Fb3e833eFE5F9c441105EB65Ef8b261266423B',
    });

    await this.registerProtocol(DfynNetworkVault, {
      chain: ChainIdEnum.plg,
      name: 'Active Pools',
      feature: FeatureEnum.staking,
      poolList: [
        '0x384249f6b345b5feab453558b1ca1713f953bf8e',
        '0x356fE56801Fdb5bb44f63023F4Ac3e26588A3723',
        '0x3b02672eBc09e432c17d9fAA641981aA5c5E2107',
        '0xA1eB5Fb7c1b2d7b49c79ad1E3A0476205915Fd90',
        '0xCeD679434814068f73C7bE8815884fDd2B15D655',
        '0x8b7862622443208B26c4E7B4476413cd9891F450',
      ],
    });
  }
}
