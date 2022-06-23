import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  CurveLiquidity,
  ICurveLiquidityMeta,
} from '../support/EVM/protocols/Liquidity/CurveLiquidity';
import { CurveStakingEth, ICurveStakingMeta } from '../support/EVM/protocols/Yield/CurveStakingEth';
import { CurveStakingNonEth } from '../support/EVM/protocols/Yield/CurveStakingNonEth';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Curve extends RootPlatform {
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
        telegram: 'https://t.me/curvefi',
        twitter: 'https://twitter.com/CurveFinance',
        url: 'https://curve.fi/',
        logo: 'https://icons.llama.fi/curve.png',
        github: 'https://github.com/curvefi',
      },
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Curve Main Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x8f942c20d02befc377d41445793068908e2250d0',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Curve Main Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x094d12e5b541784701fd8d65f11fc0598fbc6332',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x47bb542b9de58b970ba50c9dae444ddb4c16751a',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.ftm,
      name: 'Curve Main Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x0f854ea9f38cea4b1c2fc79047e9d0134419d5d6',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.ftm,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x4fb93d7d320e8a263f22f62c2059dfc2a8bcbc4c',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.avax,
      name: 'Curve Main Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x8474ddbe98f5aa3179b3b3f5942d724afcdec9f6',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.avax,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x90f421832199e93d01b64daf378b183809eb0988',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.arbi,
      name: 'Curve Main Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x445fe580ef8d70ff569ab36e80c647af338db351',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.arbi,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x0e9fbb167df83ede3240d6a5fa5d40c6c6851e15',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.gnosis,
      name: 'Curve Main Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x55e91365697eb8032f98290601847296ec847210',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.opt,
      name: 'Curve Main Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0xc5cfada84e902ad92dd40194f0883ad49639b023',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.opt,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x7da64233fefb352f8f501b357c018158ed8aa455',
    });

    await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
      chain: ChainIdEnum.near,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.pools,
      address: '0x5b5cfe992adac0c9d48e05854b2d91c73a003858',
    });

    // TODO: it is necessary to additionally explore the method of obtaining contracts abi on the Harmony chain
    // await this.registerProtocol<ICurveLiquidityMeta>(CurveLiquidity, {
    //   chain: ChainIdEnum.harm,
    //   name: 'Curve Crypto Liquidity Pools',
    //   feature: FeatureEnum.pools,
    //   address: '0x5b5cfe992adac0c9d48e05854b2d91c73a003858',
    // });

    // staking

    await this.registerProtocol<ICurveStakingMeta>(CurveStakingEth, {
      chain: ChainIdEnum.eth,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.staking,
      context: {
        poolSubgraphDataUrl: 'https://api.curve.fi/api/getSubgraphData/ethereum',
        rewardToken: '0xd533a949740bb3306d119cc777fa900ba034cd52',
        apyUrl: 'https://api.curve.fi/api/getApys',
        additionalRewardsUrl: 'https://api.curve.fi/api/getMainPoolsGaugeRewards',
        factoryPoolsUrl: 'https://api.curve.fi/api/getFactoryV2Pools',
      },
    });

    await this.registerProtocol<ICurveStakingMeta>(CurveStakingNonEth, {
      chain: ChainIdEnum.ftm,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.staking,
      context: {
        poolSubgraphDataUrl: 'https://api.curve.fi/api/getSubgraphData/fantom',
        rewardToken: '0x1e4f97b9f9f913c46f1632781732927b9019c68b',
        apyUrl: 'https://api.curve.fi/api/getFactoGaugesCrvRewards/fantom',
        gaugesUrl: 'https://api.curve.fi/api/getFactoGauges/fantom',
      },
    });

    await this.registerProtocol<ICurveStakingMeta>(CurveStakingNonEth, {
      chain: ChainIdEnum.plg,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.staking,
      context: {
        poolSubgraphDataUrl: 'https://api.curve.fi/api/getSubgraphData/polygon',
        rewardToken: '0x172370d5cd63279efa6d502dab29171933a610af',
        apyUrl: 'https://api.curve.fi/api/getFactoGaugesCrvRewards/polygon',
        gaugesUrl: 'https://api.curve.fi/api/getFactoGauges/polygon',
      },
    });

    await this.registerProtocol<ICurveStakingMeta>(CurveStakingNonEth, {
      chain: ChainIdEnum.avax,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.staking,
      context: {
        poolSubgraphDataUrl: 'https://api.curve.fi/api/getSubgraphData/avalanche',
        rewardToken: '0x249848beca43ac405b8102ec90dd5f22ca513c06',
        apyUrl: 'https://api.curve.fi/api/getFactoGaugesCrvRewards/avalanche',
        gaugesUrl: 'https://api.curve.fi/api/getFactoGauges/avalanche',
      },
    });

    await this.registerProtocol<ICurveStakingMeta>(CurveStakingNonEth, {
      chain: ChainIdEnum.arbi,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.staking,
      context: {
        poolSubgraphDataUrl: 'https://api.curve.fi/api/getSubgraphData/arbitrum',
        rewardToken: '0x11cdb42b0eb46d95f990bedd4695a6e3fa034978',
        apyUrl: 'https://api.curve.fi/api/getFactoGaugesCrvRewards/arbitrum',
        gaugesUrl: 'https://api.curve.fi/api/getFactoGauges/arbitrum',
      },
    });

    await this.registerProtocol<ICurveStakingMeta>(CurveStakingNonEth, {
      chain: ChainIdEnum.gnosis,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.staking,
      context: {
        poolSubgraphDataUrl: 'https://api.curve.fi/api/getSubgraphData/xdai',
        rewardToken: '0x712b3d230f3c1c19db860d80619288b1f0bdd0bd',
        apyUrl: 'https://api.curve.fi/api/getFactoGaugesCrvRewards/xdai',
        gaugesUrl: 'https://api.curve.fi/api/getFactoGauges/xdai',
      },
    });

    await this.registerProtocol<ICurveStakingMeta>(CurveStakingNonEth, {
      chain: ChainIdEnum.opt,
      name: 'Curve Crypto Liquidity Pools',
      feature: FeatureEnum.staking,
      context: {
        poolSubgraphDataUrl: 'https://api.curve.fi/api/getSubgraphData/optimism',
        rewardToken: '0x712b3d230f3c1c19db860d80619288b1f0bdd0bd',
        apyUrl: 'https://api.curve.fi/api/getFactoGaugesCrvRewards/optimism',
        gaugesUrl: 'https://api.curve.fi/api/getFactoGauges/optimism',
      },
    });
  }
}
