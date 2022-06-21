import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { AaveV2Lending, IAaveV2Meta } from '../support/EVM/protocols/Lending/AaveV2Lending';
import { GeistStakingLocking } from '../support/EVM/protocols/Yield/GeistStakingLocking';
import { IMasterChefMeta } from '../support/EVM/protocols/Yield/MasterChef';
import { MasterGeist } from '../support/EVM/protocols/Yield/MasterGeist';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Geist extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register(): Promise<void> {
    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://geist.finance/markets',
        logo: 'https://icons.llama.fi/geist-finance.jpg',
        telegram: 'https://t.me/geist_finance',
        discord: 'https://discord.com/invite/b6cXdZRNSK',
        twitter: 'https://twitter.com/GeistFinance',
      },
    });

    await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
      chain: ChainIdEnum.ftm,
      name: 'Lending - Geist',
      feature: FeatureEnum.lending,
      address: '0x9FAD24f572045c7869117160A571B2e50b10d068',
    });

    await this.registerProtocol<IMasterChefMeta & { context: { rewardToken: string } }>(
      MasterGeist,
      {
        chain: ChainIdEnum.ftm,
        name: 'Staking - Geist',
        feature: FeatureEnum.staking,
        address: '0xE40b7FA6F5F7FB0Dc7d56f433814227AAaE020B5',
        context: {
          rewardToken: '0xd8321aa83fb0a4ecd6348d4577431310a6e0814d',
        },
      },
    );

    await this.registerProtocol<IMasterChefMeta>(GeistStakingLocking, {
      chain: ChainIdEnum.ftm,
      name: 'Staking - Geist',
      feature: FeatureEnum.staking,
      address: '0x49c93a95dbcc9a6a4d8f77e59c038ce5020e82f8',
    });
  }
}
