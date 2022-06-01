import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { endpoints } from '../support/EVM/Subgraphs/MakerDAOSubgraph';
import { MakerVault, MakerVaultInterface } from '../support/EVM/protocols/Lending/MakerVault';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class MakerDAO extends RootPlatform {
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
        url: 'https://makerdao.com',
        twitter: 'https://twitter.com/MakerDAO',
        telegram: 'https://t.me/makerdaoOfficial',
        discord: 'https://chat.makerdao.com/',
        github: 'https://github.com/makerdao',
      },
    });

    /**
     * Test Address: 0x1e21d538c7b6733ecc3ce593c47bf0c23240998c
     * Test Vault: 0x2f0b23f53734252bda2277357e97e1517d6b042a
     * Test TX: https://etherscan.io/tx/0x60354835ef486379cb8468be3b554ce0cf6af74dcf3f92edef96deafc01d6e24
     * more info: https://defiexplore.com/address/0x1e21d538c7b6733ecc3ce593c47bf0c23240998c
     *
     * Test Address 2: 0x2c51978916976e9041d22e3b164f033e553e2c3d
     * Test Address 3: 0x8fd589aa8bfa402156a6d1ad323fec0ecee50d9d
     * Test Address 4: 0x87a67e7dc32fdc79853d780c6f516312b4a503b5 # whale, 2 positions
     */
    await this.registerProtocol<MakerVaultInterface>(MakerVault, {
      chain: ChainIdEnum.eth,
      name: 'MakerDAO Vaults - Oasis.App Borrow',
      links: {
        getOpportunityLink: (opp) => `https://oasis.app/vaults/open/${opp.meta.name}`,
      },
      feature: FeatureEnum.lending,
      context: {
        subgraph: endpoints.eth,
      },
    });
  }
}
