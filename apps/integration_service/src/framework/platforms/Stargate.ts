import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { StargateLiquidity } from '../support/EVM/protocols/Liquidity/StargateLiquidity';
import { StargateStaking } from '../support/EVM/protocols/Yield/StargateStaking';
import { RootPlatform } from '../support/RootPlatform';

export class Stargate extends RootPlatform {
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
        url: 'https://stargate.finance/',
        logo: 'https://icons.llama.fi/stargate.png',
        twitter: 'StargateFinance',
      },
    });

    await this.registerProtocol(StargateStaking, {
      chain: ChainIdEnum.bnb,
      name: 'Stargate',
      feature: FeatureEnum.staking,
      address: '0x3052a0f6ab15b4ae1df39962d5ddefaca86dab47',
      context: { rewardToken: '0xb0d502e938ed5f4df2e681fe6e419ff29631d62b' },
    });

    await this.registerProtocol(StargateLiquidity, {
      chain: ChainIdEnum.bnb,
      name: 'Stargate',
      feature: FeatureEnum.pools,
      address: '0x3052a0f6ab15b4ae1df39962d5ddefaca86dab47',
    });

    await this.registerProtocol(StargateStaking, {
      chain: ChainIdEnum.avax,
      name: 'Stargate',
      feature: FeatureEnum.staking,
      address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98',
      context: { rewardToken: '0x2f6f07cdcf3588944bf4c42ac74ff24bf56e7590' },
    });

    await this.registerProtocol(StargateLiquidity, {
      chain: ChainIdEnum.avax,
      name: 'Stargate',
      feature: FeatureEnum.pools,
      address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98',
    });

    await this.registerProtocol(StargateStaking, {
      chain: ChainIdEnum.plg,
      name: 'Stargate',
      feature: FeatureEnum.staking,
      address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98',
      context: { rewardToken: '0x2f6f07cdcf3588944bf4c42ac74ff24bf56e7590' },
    });

    await this.registerProtocol(StargateLiquidity, {
      chain: ChainIdEnum.plg,
      name: 'Stargate',
      feature: FeatureEnum.pools,
      address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98',
    });

    await this.registerProtocol(StargateStaking, {
      chain: ChainIdEnum.arbi,
      name: 'Stargate',
      feature: FeatureEnum.staking,
      address: '0xeA8DfEE1898a7e0a59f7527F076106d7e44c2176',
      context: { rewardToken: '0x6694340fc020c5e6b96567843da2df01b2ce1eb6' },
    });

    await this.registerProtocol(StargateLiquidity, {
      chain: ChainIdEnum.arbi,
      name: 'Stargate',
      feature: FeatureEnum.pools,
      address: '0xeA8DfEE1898a7e0a59f7527F076106d7e44c2176',
    });

    await this.registerProtocol(StargateStaking, {
      chain: ChainIdEnum.opt,
      name: 'Stargate',
      feature: FeatureEnum.staking,
      address: '0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8',
      context: { rewardToken: '0x296f55f8fb28e498b858d0bcda06d955b2cb3f97' },
    });

    await this.registerProtocol(StargateLiquidity, {
      chain: ChainIdEnum.opt,
      name: 'Stargate',
      feature: FeatureEnum.pools,
      address: '0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8',
    });

    await this.registerProtocol(StargateStaking, {
      chain: ChainIdEnum.ftm,
      name: 'Stargate',
      feature: FeatureEnum.staking,
      address: '0x224D8Fd7aB6AD4c6eb4611Ce56EF35Dec2277F03',
      context: { rewardToken: '0x2f6f07cdcf3588944bf4c42ac74ff24bf56e7590' },
    });

    await this.registerProtocol(StargateLiquidity, {
      chain: ChainIdEnum.ftm,
      name: 'Stargate',
      feature: FeatureEnum.pools,
      address: '0x224D8Fd7aB6AD4c6eb4611Ce56EF35Dec2277F03',
    });
  }
}
