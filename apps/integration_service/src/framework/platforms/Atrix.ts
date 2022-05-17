import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { RootPlatform } from '../support/RootPlatform';
import { AtrixStaking } from '../support/Solana/protocols/Yield/AtrixStaking';
import { IAtrixSolanaMeta } from '../support/Solana/protocols/interfaces/Atrix/AtrixStaking';

export class Atrix extends RootPlatform {
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
      links: {
        url: 'https://app.atrix.finance/',
        logo: 'https://icons.llama.fi/atrix.png',
        twitter: 'Atrix',
      },
    });

    await this.registerProtocol<IAtrixSolanaMeta>(AtrixStaking, {
      chain: ChainIdEnum.sol,
      name: 'Atrix - Staking',
      feature: FeatureEnum.staking,
      context: {
        endpoint: 'https://api.atrix.finance/api/farms',
        programID: 'BLDDrex4ZSWBgPYaaH6CQCzkJXWfzCiiur9cSFJT8t3x',
      },
    });
  }
}
