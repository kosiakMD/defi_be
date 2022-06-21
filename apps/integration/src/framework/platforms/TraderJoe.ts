import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { MasterChefJoe } from '../support/EVM/protocols/Yield/MasterChefJoe';
import { IsJOEStakingMeta, sJOEStaking } from '../support/EVM/protocols/Yield/sJOEStaking';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class TraderJoe extends RootPlatform {
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
        url: 'https://traderjoexyz.com',
        logo: 'https://icons.llama.fi/trader-joe.png',
        twitter: 'traderjoe_xyz',
        telegram: 'traderjoe_xyz_ann',
        discord: 'https://discord.com/invite/GHZceZhbZU',
      },
    });

    // await this.registerProtocol(MasterChefJoe, {
    //   chain: ChainIdEnum.avax,
    //   name: 'MasterChefJoeV2',
    //   feature: FeatureEnum.staking,
    //   address: '0xd6a4F121CA35509aF06A0Be99093d08462f53052',
    // });

    await this.registerProtocol(MasterChefJoe, {
      chain: ChainIdEnum.avax,
      name: 'MasterChefJoeV3',
      feature: FeatureEnum.staking,
      address: '0x188bED1968b795d5c9022F6a0bb5931Ac4c18F00',
    });

    // await this.registerProtocol<any>(TraderJoeLiquidity, {
    //   chain: ChainIdEnum.avax,
    //   name: 'JoeFactory',
    //   feature: FeatureEnum.staking,
    //   address: '0xA9a438B8b2E41B3bf322DBA139aF9490DC226953',
    // });

    // await this.registerProtocol<IsJOEStakingMeta>(sJOEStaking, {
    //   chain: ChainIdEnum.avax,
    //   name: 'JoeFactory',
    //   feature: FeatureEnum.staking,
    //   address: '0x1a731b2299e22fbac282e7094eda41046343cb51',
    //   context: {
    //     stakingToken: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd',
    //     rewardToken: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    //   },
    // });

    // veJoe Test 0x46f41e39facdd1ea0e957827ef01082cb96dd361
    // veJoe Test 0x1bda63dab1743089af8c0c94ed0b75772a9b9858
  }
}
