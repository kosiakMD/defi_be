import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { RootPlatform } from '../support/RootPlatform';
import { AtrixStaking, IAtrixSolanaMeta } from '../support/Solana/protocols/Yield/AtrixStaking';
import { FeatureEnum } from '../support/enums';

export class Atrix extends RootPlatform {
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
        program: 'BLDDrex4ZSWBgPYaaH6CQCzkJXWfzCiiur9cSFJT8t3x',
      },
    });
  }
}
