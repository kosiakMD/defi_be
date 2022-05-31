import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  EllipsisLiquidity,
  IEllipsisLiquidityMeta,
} from '../support/EVM/protocols/Liquidity/EllipsisLiquidity';
import {
  EllipsisLpStaking,
  IEllipsisLPStakingMeta,
} from '../support/EVM/protocols/Yield/EllipsisLpStaking';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Ellipsis extends RootPlatform {
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
        telegram: 'https://t.me/ellipsisfinance',
        twitter: 'https://twitter.com/ellipsisfi',
        url: 'https://ellipsis.finance/',
        github: 'https://github.com/ellipsis-finance',
      },
    });

    await this.registerProtocol<IEllipsisLiquidityMeta>(EllipsisLiquidity, {
      chain: ChainIdEnum.bnb,
      name: 'Ellipsis Liquidity Pools',
      feature: FeatureEnum.pools,
      // not factory, because we want to display only pools present on the web site, not deployed by users
      address: '0x5b74c99aa2356b4eaa7b85dc486843edff8dfdbe',
      links: {
        getOpportunityLink: (opportunity) => {
          return `https://ellipsis.finance/pool/` + opportunity.meta.minter;
        },
      },
      context: {
        aprUrl: 'https://api.ellipsis.finance/api/getAPRs',
      },
    });

    await this.registerProtocol<IEllipsisLPStakingMeta>(EllipsisLpStaking, {
      chain: ChainIdEnum.bnb,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x5b74c99aa2356b4eaa7b85dc486843edff8dfdbe',
      links: {
        getOpportunityLink: (opportunity) => {
          return `https://ellipsis.finance/pool/` + opportunity.meta.minter;
        },
      },
      context: {
        aprUrl: 'https://api.ellipsis.finance/api/getAPRs',
      },
    });
  }
}
