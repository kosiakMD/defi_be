import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  ArrakisLiquidity,
  IArrakisMeta,
} from '../support/EVM/protocols/Liquidity/ArrakisLiquidity';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Arrakis extends RootPlatform {
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
        discord: 'https://discord.com/invite/arrakisfinance',
        url: 'https://www.arrakis.finance/',
        logo: 'https://icons.llama.fi/pancakeswap.jpg',
        twitter: 'https://twitter.com/ArrakisFinance',
      },
    });

    await this.registerProtocol<IArrakisMeta>(ArrakisLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Liquidity - Arrakis',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gelatodigital/g-uni-polygon',
      gaugeMapperAddress: '0xD526D8De90d54E9ea16C0Da810A2Dd3FD0e8F930',
    });

    await this.registerProtocol<IArrakisMeta>(ArrakisLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Liquidity - Arrakis',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gelatodigital/g-uni',
    });

    await this.registerProtocol<IArrakisMeta>(ArrakisLiquidity, {
      chain: ChainIdEnum.opt,
      name: 'Liquidity - Arrakis',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/gelatodigital/g-uni-optimism',
    });
  }
}
