import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  ISushiLendingMeta,
  SushiswapLending,
} from '../support/EVM/protocols/Lending/SushiswapLending';
import {
  ISushiPoolMeta,
  SushiswapLiquidity,
} from '../support/EVM/protocols/Liquidity/SushiswapLiquidity';
import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { MasterChefV2 } from '../support/EVM/protocols/Yield/MasterChefV2';
import { SushiswapStakingSingle } from '../support/EVM/protocols/Yield/SushiswapStakingSingle';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class SushiSwap extends RootPlatform {
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
        url: 'https://www.sushi.com/',
        logo: 'https://icons.llama.fi/sushiswap.jpg',
        twitter: 'SushiSwap',
      },
    });
    // lending
    await this.registerProtocol<ISushiLendingMeta>(SushiswapLending, {
      chain: ChainIdEnum.eth,
      name: 'Kashi lending',
      feature: FeatureEnum.lending,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/bentobox',
      pairsPerQuery: 100,
    });

    await this.registerProtocol<ISushiLendingMeta>(SushiswapLending, {
      chain: ChainIdEnum.arbi,
      name: 'Kashi lending',
      feature: FeatureEnum.lending,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/arbitrum-bentobox',
      pairsPerQuery: 100,
    });

    await this.registerProtocol<ISushiLendingMeta>(SushiswapLending, {
      chain: ChainIdEnum.bnb,
      name: 'Kashi lending',
      feature: FeatureEnum.lending,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/bsc-bentobox',
      pairsPerQuery: 100,
    });

    await this.registerProtocol<ISushiLendingMeta>(SushiswapLending, {
      chain: ChainIdEnum.plg,
      name: 'Kashi lending',
      feature: FeatureEnum.lending,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/matic-bentobox',
      pairsPerQuery: 100,
    });

    await this.registerProtocol<ISushiLendingMeta>(SushiswapLending, {
      chain: ChainIdEnum.gnosis,
      name: 'Kashi lending',
      feature: FeatureEnum.lending,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/xdai-bentobox',
      pairsPerQuery: 100,
    });

    //pools
    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 40000,
      balanceCallsPerQuery: 1000,
    });

    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.arbi,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/arbitrum-exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 10000,
      balanceCallsPerQuery: 1000,
    });

    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.avax,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/avalanche-exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 10000,
      balanceCallsPerQuery: 1000,
    });

    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.bnb,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/bsc-exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 10000,
      balanceCallsPerQuery: 1000,
    });

    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.celo,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/celo-exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 10000,
      balanceCallsPerQuery: 1000,
    });

    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.ftm,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/fantom-exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 10000,
      balanceCallsPerQuery: 1000,
    });

    // harmony subgraph sometimes throws timeout error
    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.harm,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://sushi.graph.t.hmny.io/subgraphs/name/sushiswap/harmony-exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 10000,
      balanceCallsPerQuery: 1000,
    });

    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 10000,
      balanceCallsPerQuery: 1000,
    });

    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.gnosis,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/xdai-exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 10000,
      balanceCallsPerQuery: 1000,
    });

    await this.registerProtocol<ISushiPoolMeta>(SushiswapLiquidity, {
      chain: ChainIdEnum.mriver,
      name: 'Sushiswap pools',
      feature: FeatureEnum.pools,
      subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/moonriver-exchange',
      pairsPerQuery: 100,
      minUSDPairsReserve: 10000,
      balanceCallsPerQuery: 1000,
    });

    // staking
    await this.registerProtocol(MasterChefV2, {
      chain: ChainIdEnum.plg,
      name: 'Sushiswap staking',
      feature: FeatureEnum.staking,
      address: '0x0769fd68dfb93167989c6f7254cd0d766fb2841f',
      context: {},
    });

    await this.registerProtocol(MasterChefV2, {
      chain: ChainIdEnum.ftm,
      name: 'Sushiswap staking',
      feature: FeatureEnum.staking,
      address: '0xf731202a3cf7efa9368c2d7bd613926f7a144db5',
      context: {},
    });

    await this.registerProtocol(MasterChefV2, {
      chain: ChainIdEnum.gnosis,
      name: 'Sushiswap staking',
      feature: FeatureEnum.staking,
      address: '0xddcbf776df3de60163066a5dddf2277cb445e0f3',
      context: {},
    });

    // TODO: it is necessary to additionally explore the method of obtaining contracts abi on the Harmony chain
    // await this.registerProtocol(SushiswapStakingV2, {
    //   chain: ChainIdEnum.harm,
    //   name: 'Sushiswap staking',
    //   feature: FeatureEnum.staking,
    //   address: '0xddcbf776df3de60163066a5dddf2277cb445e0f3',
    // });

    await this.registerProtocol(MasterChefV2, {
      chain: ChainIdEnum.mriver,
      name: 'Sushiswap staking',
      feature: FeatureEnum.staking,
      address: '0x3db01570d97631f69bbb0ba39796865456cf89a5',
      context: {},
    });

    await this.registerProtocol(MasterChefV2, {
      chain: ChainIdEnum.arbi,
      name: 'Sushiswap staking',
      feature: FeatureEnum.staking,
      address: '0xf4d73326c13a4fc5fd7a064217e12780e9bd62c3',
      context: {},
    });

    await this.registerProtocol(MasterChefV2, {
      chain: ChainIdEnum.fuse,
      name: 'Sushiswap staking',
      feature: FeatureEnum.staking,
      address: '0x182cd0c6f1faec0aed2ea83cd0e160c8bd4cb063',
      context: {},
    });

    await this.registerProtocol(MasterChef, {
      chain: ChainIdEnum.eth,
      name: 'Sushiswap masterChefV1 staking',
      feature: FeatureEnum.staking,
      address: '0xc2edad668740f1aa35e4d8f227fb8e17dca888cd',
      context: {},
    });

    await this.registerProtocol(MasterChefV2, {
      chain: ChainIdEnum.eth,
      name: 'Sushiswap masterChefV2 staking',
      feature: FeatureEnum.staking,
      address: '0xef0881ec094552b2e128cf945ef17a6752b4ec5d',
      context: {},
    });

    await this.registerProtocol(SushiswapStakingSingle, {
      chain: ChainIdEnum.eth,
      name: 'Sushiswap sushiToken staking',
      feature: FeatureEnum.staking,
      address: '0x8798249c2e607446efb7ad49ec89dd1865ff4272',
      sushi: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
      context: {},
    });
  }
}
