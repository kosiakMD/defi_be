import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { AutoFarmV2 } from '../support/EVM/protocols/Yield/AutoFarmV2';
import { AutoFarmV2CrossChain } from '../support/EVM/protocols/Yield/AutoFarmV2CrossChain';
import { IMasterChefMeta } from '../support/EVM/protocols/Yield/MasterChef';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class AutoFarm extends RootPlatform {
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
        telegram: 'https://t.me/autofarm_network',
        twitter: 'https://twitter.com/autofarmnetwork',
        url: 'https://autofarm.network/',
        github: 'https://github.com/autofarmnetwork',
        discord: 'https://discord.com/invite/bJ9ZsypQzv',
      },
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2, {
      chain: ChainIdEnum.bnb,
      name: 'AutoFarmV2',
      feature: FeatureEnum.staking,
      address: '0x0895196562c7868c5be92459fae7f877ed450452',
      context: {
        badPools: [0, 331, 369],
      },
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.avax,
      name: 'AutoFarmV2',
      feature: FeatureEnum.staking,
      address: '0x864a0b7f8466247a0e44558d29cdc37d4623f213',
      context: {
        badPools: [67, 77, 79],
      },
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.cro,
      name: 'AutoFarmV2',
      feature: FeatureEnum.staking,
      address: '0x76b8c3ecdf99483335239e66f34191f11534cbaa',
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.celo,
      name: 'AutoFarmV2',
      feature: FeatureEnum.staking,
      address: '0xdd11b66b90402f294a017c4688509c364312303f',
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.ftm,
      name: 'AutoFarmV2',
      feature: FeatureEnum.staking,
      address: '0x76b8c3ecdf99483335239e66f34191f11534cbaa',
      context: {
        badPools: [75, 76, 87, 89, 93],
      },
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.harm,
      name: 'AutoFarmV2CrossChain',
      feature: FeatureEnum.staking,
      address: '0x9c57658139afb41949cebc07d806f37d29d13eea',
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.heco,
      name: 'AutoFarmV2CrossChain',
      feature: FeatureEnum.staking,
      address: '0x96a29c4bce3126266983f535b41c30dba80d5d99',
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2, {
      chain: ChainIdEnum.heco,
      name: 'AutoFarmV2 - OLD',
      feature: FeatureEnum.staking,
      address: '0xb09a88956730b6b842d9f1cf6f72dd682c2f36f9',
      context: {
        badPools: [0, 1],
      },
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.mriver,
      name: 'AutoFarmV2CrossChain',
      feature: FeatureEnum.staking,
      address: '0xfada8cc923514f1d7b0586ad554b4a0cead4680e',
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.okex,
      name: 'AutoFarmV2CrossChain',
      feature: FeatureEnum.staking,
      address: '0x864a0b7f8466247a0e44558d29cdc37d4623f213',
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.plg,
      name: 'AutoFarmV2CrossChain',
      feature: FeatureEnum.staking,
      address: '0x89d065572136814230a55ddeeddec9df34eb0b76',
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.boba,
      name: 'AutoFarmV2CrossChain',
      feature: FeatureEnum.staking,
      address: '0x864a0b7f8466247a0e44558d29cdc37d4623f213',
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.gnosis,
      name: 'AutoFarmV2CrossChain',
      feature: FeatureEnum.staking,
      address: '0xfada8cc923514f1d7b0586ad554b4a0cead4680e',
    });

    await this.registerProtocol<IMasterChefMeta>(AutoFarmV2CrossChain, {
      chain: ChainIdEnum.near,
      name: 'AutoFarmV2CrossChain',
      feature: FeatureEnum.staking,
      address: '0x62537419c8327ab66165bae205da8fcb6871a700',
    });
  }

  // contracts for missed networks;
  // velas - 0xad2db12795ced89ca2d1819710233106115e3034
  // oasis - 0xbf19c3fe078258f1d1c34bec7e624ad8a1de343a
  // moonbeam - 0x77286f5257e090b1bedbc6df6726d53cbf8573a6
}
