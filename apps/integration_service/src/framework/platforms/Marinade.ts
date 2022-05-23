import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { RootPlatform } from '../support/RootPlatform';
import {
  IMarinadeSolanaMeta,
  MarinadeStaking,
} from '../support/Solana/protocols/Yield/MarinadeStaking';
import { FeatureEnum } from '../support/enums';

export class Marinade extends RootPlatform {
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
        url: 'https://marinade.finance/',
        logo: 'https://icons.llama.fi/marinade.png',
        twitter: 'MarinadeFinance',
      },
    });

    await this.registerProtocol<IMarinadeSolanaMeta>(MarinadeStaking, {
      chain: ChainIdEnum.sol,
      name: 'Lido',
      feature: FeatureEnum.staking,
      address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSol
      context: {
        stakedToken: '11111111111111111111111111111111',
        statsApi: 'https://api.marinade.finance/msol/apy/1y',
        statsProcessor: (data: Record<string, number>) => ({
          apr: data.value,
          exchangeRate: data.end_price,
        }),
      },
    });
  }
}
