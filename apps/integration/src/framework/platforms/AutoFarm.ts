import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { AutoFarmV2 } from '../support/EVM/protocols/Yield/AutoFarmV2';
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
    });
  }
}
