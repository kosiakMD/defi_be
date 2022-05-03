import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { MasterChefAceLab } from '../support/EVM/protocols/Yield/MasterChefAceLab';
import { RootPlatform } from '../support/RootPlatform';
import { IProtocolMeta } from '../support/interfaces';

interface IMasterChefMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  name: string; // Genesis, Farm, AceLab
  context?: {
    badPools?: number[]; // poolIds to skip
    [key: string]: any;
  };
  links: {
    getOpportunityLink: () => string;
  };
}

export class SpookySwap extends RootPlatform {
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
        logo: 'https://icons.llama.fi/spookyswap.jpg',
        discord: 'https://discord.gg/spookyswap',
        telegram: 'https://t.me/SpookySwapCommunity',
        twitter: 'spookyswap',
        url: 'https://spookyswap.finance/',
        github: 'SpookySwap',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.ftm,
      name: 'Farms',
      feature: FeatureEnum.staking,
      address: '0x2b2929E785374c651a81A63878Ab22742656DcDd',
      // dynamic link generators
      links: {
        // link to the farms home page
        // home: 'https://spookyswap.finance/farms',
        // generate a link to a specific opportunity page
        getOpportunityLink: () => `https://spookyswap.finance/farms`,
        // generate a link to buy the deposit token (if available)
        // getTokenLink: (token) => `https://spookyswap.finance/swap?outputCurrency=${token}`,
        // // generate a link to get liquidity for the token
        // getLiquidityLink: (tokenA: string, tokenB: string) =>
        //   `https://spookyswap.finance/add/${tokenA}/${tokenB}`,
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChefAceLab, {
      chain: ChainIdEnum.ftm,
      name: 'AceLab',
      feature: FeatureEnum.staking,
      address: '0x2352b745561e7e6FCD03c093cE7220e3e126ace0',
      links: {
        getOpportunityLink: () => `https://spookyswap.finance/pools`,
      },
    });
  }
}
