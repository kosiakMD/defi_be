import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { IOccamXProtocolMeta } from '../support/EVM/Bases/OccamX/occamx.interfaces';
import { OccamXLiquidity } from '../support/EVM/protocols/Liquidity/OccamXLiquidity';
import { OccamXFarms } from '../support/EVM/protocols/Yield/OccamXFarms';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class OccamX extends RootPlatform {
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
        url: 'https://app.occam-x.fi/',
        logo: 'https://app.occam-x.fi/favicon.ico',
        twitter: 'occamDEX',
        telegram: 'OccamX',
      },
    });

    await this.registerProtocol<IOccamXProtocolMeta>(OccamXLiquidity, {
      chain: ChainIdEnum.milkomeda,
      name: 'Occam X - Pools',
      feature: FeatureEnum.pools,
      context: {
        endpoint: {
          allPools: 'https://api-mainnet.occam-x.fi/pools/all',
          subgraph: 'https://lm-api.occam-x.fi',
        },
      },
      api: {
        endpoint: 'https://api-mainnet.occam-x.fi/pools/all',
        path: '$..liquidity_token.contract',
      },
    });

    await this.registerProtocol<IOccamXProtocolMeta>(OccamXFarms, {
      chain: ChainIdEnum.milkomeda,
      name: 'Occam X - Farms',
      feature: FeatureEnum.staking,
      context: {
        endpoint: {
          allPools: 'https://api-mainnet.occam-x.fi/pools/all',
          subgraph: 'https://lm-api.occam-x.fi',
        },
      },
      api: {
        endpoint: 'https://api-mainnet.occam-x.fi/pools/all',
        path: '$..liquidity_token.contract',
      },
    });
  }
}
