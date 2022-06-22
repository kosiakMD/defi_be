import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { AaveV2Lending, IAaveV2Meta } from '../support/EVM/protocols/Lending/AaveV2Lending';
import { InterestBearingToken } from '../support/EVM/protocols/Yield/InterestBearingToken';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class AaveV2 extends RootPlatform {
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
        url: 'https://aave.com',
        logo: 'https://icons.llama.fi/aave-v3.png',
        twitter: 'AaveAave',
      },
    });

    // await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
    //   chain: ChainIdEnum.eth,
    //   name: 'Lending - Aave',
    //   feature: FeatureEnum.lending,
    //   address: '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9',
    //   incentives: '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5',
    // });

    // await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
    //   chain: ChainIdEnum.plg,
    //   name: 'Lending - Aave',
    //   feature: FeatureEnum.lending,
    //   address: '0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf',
    //   incentives: '0x357D51124f59836DeD84c8a1730D72B749d8BC23',
    // });

    // await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
    //   chain: ChainIdEnum.avax,
    //   name: 'Lending - Aave',
    //   feature: FeatureEnum.lending,
    //   address: '0x4F01AeD16D97E3aB5ab2B501154DC9bb0F1A5A2C',
    //   incentives: '0x01D83Fe6A10D2f2B7AF17034343746188272cAc9',
    // });

    // Stake a single token with an underlying balance
    // poolslist => just the token
    // user balance => balance of main address * exchange rate (underlying could be LP token, etc)
    // test address: 0x4ca31d938bc2d23e68eab871e5a0a02019f8dce6
    await this.registerProtocol(InterestBearingToken, {
      chain: ChainIdEnum.eth,
      name: 'Safety Module',
      feature: FeatureEnum.staking,
      address: '0x4da27a545c0c5b758a6ba100e3a049001de870f5',
    });

    await this.registerProtocol(InterestBearingToken, {
      chain: ChainIdEnum.eth,
      name: 'Safety Module',
      feature: FeatureEnum.staking,
      address: '0xa1116930326d21fb917d5a27f1e9943a9595fb47',
    });
  }
}
