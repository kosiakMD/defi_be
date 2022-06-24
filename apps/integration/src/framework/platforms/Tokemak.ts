import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import {
  ITokemakClaimableMeta,
  TokemakClaimable,
} from '../support/EVM/protocols/Claimable/TokemakClaimable';
import { TokemakReactor } from '../support/EVM/protocols/Yield/TokemakReactor';
import { TokemakStaking } from '../support/EVM/protocols/Yield/TokemakStaking';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Tokemak extends RootPlatform {
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
        url: 'https://www.tokemak.xyz/',
        logo: 'https://www.tokemak.xyz/images/logos/tokemak.svg',
        twitter: 'https://twitter.com/tokenreactor',
        discord: 'https://discord.com/invite/Z5f92tfzh4',
      },
    });

    await this.registerProtocol(TokemakReactor, {
      chain: ChainIdEnum.eth,
      name: 'Tokemak - Reactors',
      feature: FeatureEnum.staking,
      address: '0xA86e412109f77c45a3BC1c5870b880492Fb86A14',
    });

    await this.registerProtocol(TokemakStaking, {
      chain: ChainIdEnum.eth,
      name: 'Tokemak - Staking',
      feature: FeatureEnum.staking,
      address: '0x96F98Ed74639689C3A11daf38ef86E59F43417D3',
    });

    await this.registerProtocol<ITokemakClaimableMeta>(TokemakClaimable, {
      chain: ChainIdEnum.eth,
      name: 'Tokemak - Rewards',
      feature: FeatureEnum.claimable,
      ipfsGateway: 'https://ipfs.tokemaklabs.xyz/ipfs',
      address: '0x79dD22579112d8a5F7347c5ED7E609e60da713C5',
      rewardHash: '0x5ec3EC6A8aC774c7d53665ebc5DDf89145d02fB6',
      rewardToken: '0x2e9d63788249371f1DFC918a52f8d799F4a38C94',
    });
  }
}
