import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { IronFinanceLiquidity } from '../support/EVM/protocols/Liquidity/ironFinanceLiquidity';
import { RootLocked } from '../support/EVM/protocols/Locked/RootLocked';
import { IronFinanceStaking } from '../support/EVM/protocols/Yield/IronFinanceStaking';
import { IronFinanceStakingICE } from '../support/EVM/protocols/Yield/IronFinanceStakingBlueICE';
import { IMasterChefMeta } from '../support/EVM/protocols/Yield/MasterChef';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class IronFinance extends RootPlatform {
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
        url: 'https://app.iron.finance/',
        twitter: 'IronFinance',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(IronFinanceStaking, {
      chain: ChainIdEnum.plg,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x1fd1259fa8cdc60c6e8c86cfa592ca1b8403dfad',
    });

    await this.registerProtocol<IMasterChefMeta>(IronFinanceStaking, {
      chain: ChainIdEnum.ftm,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x733a33312fbffe22c86bf1204264f3fa06c7ab65',
    });

    await this.registerProtocol<IMasterChefMeta>(RootLocked, {
      chain: ChainIdEnum.plg,
      name: 'Farms - LockedBalance',
      feature: FeatureEnum.staking,
      address: '0xb1bf26c7b43d2485fa07694583d2f17df0dde010',
    });

    await this.registerProtocol<IMasterChefMeta>(IronFinanceStakingICE, {
      chain: ChainIdEnum.plg,
      name: 'Farms - BlueICE',
      feature: FeatureEnum.staking,
      address: '0xbde0b5916a4ea46066cc402417cd66c5d1244a2d',
    });

    await this.registerProtocol(IronFinanceLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Liquidity',
      feature: FeatureEnum.pools,
      address: '0xcaeb732167af742032d13a9e76881026f91cd087',
      context: {
        pool: '0x985d40fedaa3208dabacdfdca00cbeaac9543949',
      },
    });

    await this.registerProtocol(IronFinanceLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Liquidity',
      feature: FeatureEnum.pools,
      address: '0x837503e8a8753ae17fb8c8151b8e6f586defcb57',
      context: {
        pool: '0xb4d09ff3da7f9e9a2ba029cb0a81a989fd7b8f17',
      },
    });

    await this.registerProtocol(IronFinanceLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Liquidity',
      feature: FeatureEnum.pools,
      address: '0xe440ccc13e6f273c110cf3cf4087c23a66b8e872',
      context: {
        pool: '0xc7ed08dee89d85ffe0f3ed22681c4d613bc46385',
      },
    });

    await this.registerProtocol(IronFinanceLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Liquidity',
      feature: FeatureEnum.pools,
      address: '0x4a783cd1b4543559ece45db47e07e0cb59e55c09',
      context: {
        pool: '0x3d479ce22d8f091df67f8fb8f579251d1b1b3152',
      },
    });

    await this.registerProtocol(IronFinanceLiquidity, {
      chain: ChainIdEnum.ftm,
      name: 'Liquidity',
      feature: FeatureEnum.pools,
      address: '0x952bda8a83c3d5f398a686bb4e8c6dd90072d523',
      context: {
        pool: '0xc143a1500ca4a471ee9cc70b9ac0c739576f84bb',
      },
    });

    await this.registerProtocol(IronFinanceLiquidity, {
      chain: ChainIdEnum.avax,
      name: 'Liquidity',
      feature: FeatureEnum.pools,
      address: '0x952bda8a83c3d5f398a686bb4e8c6dd90072d523',
      context: {
        pool: '0xc143a1500ca4a471ee9cc70b9ac0c739576f84bb',
      },
    });
  }
}
