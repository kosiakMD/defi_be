import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  YetiFinanceLending,
  YetiFinanceMeta,
} from '../support/EVM/protocols/Lending/YetiFinanceLending';
import { IYetiStabilityPoolMeta } from '../support/EVM/protocols/Yield/YetiStabilityPool';
import { YetiStabilityPool } from '../support/EVM/protocols/Yield/YetiStabilityPool';
import {
  IveYETIStakingPoolMeta,
  veYETIStaking,
} from '../support/EVM/protocols/Yield/veYETIStaking';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class YetiFinance extends RootPlatform {
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
        discord: 'https://discord.com/invite/yetifinance',
        telegram: 'https://t.me/yetifinance',
        twitter: 'https://twitter.com/YetiFinance',
        url: 'https://app.yeti.finance/',
        github: 'https://github.com/Yeti-Finance',
      },
    });

    await this.registerProtocol<IYetiStabilityPoolMeta>(YetiStabilityPool, {
      chain: ChainIdEnum.avax,
      name: 'StabilityPool',
      feature: FeatureEnum.staking,
      address: '0xfffffffffff5d3627294fec5081ce5c5d7fa6451', // StabilityPool
      context: {
        stakedToken: '0x111111111111ed1d73f860f57b2798b683f2d325', // YUSD Stablecoin
        rewardToken: '0x77777777777d4554c39223c354a05825b2e8faa3', // Yeti Finance
      },
    });

    await this.registerProtocol<IveYETIStakingPoolMeta>(veYETIStaking, {
      chain: ChainIdEnum.avax,
      name: '$veYETI',
      feature: FeatureEnum.staking,
      address: '0x88888888847df39cf1dfe1a05c904b4e603c9416', // $veYETI
      context: {
        stakedToken: '0x77777777777d4554c39223c354a05825b2e8faa3', // Yeti Finance
        veYETIEmissions: '0x1ca865D89ccABc6805699aFc5F375b6366371B5B', // Yeti Finance
      },
    });

    await this.registerProtocol<YetiFinanceMeta>(YetiFinanceLending, {
      chain: ChainIdEnum.avax,
      name: 'YetiFinanceLending',
      feature: FeatureEnum.lending,
      address: '0xcccccccccccc053fd8d1ff275da4183c2954dbe3', // YetiController
      context: {
        // sourceAPR: 'https://api.yeti.finance/v1/Collaterals', // Collaterals APY
        borrowedToken: '0x111111111111ed1d73f860f57b2798b683f2d325', // YUSD Stablecoin
        troveManager: '0x000000000000614c27530d24B5f039EC15A61d8d', // TroveManager
      },
    });
  }
}
