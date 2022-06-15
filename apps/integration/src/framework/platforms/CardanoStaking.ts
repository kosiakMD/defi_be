import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { CardanoDelegation } from '../support/Cardano/Yield/CardanoDelegation';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';
import { IProtocolMeta } from '../support/interfaces';

/**
 * TODO: Should these be split up per chain so Platform.name can be i.e. 'Solana Delegators'
 */
export class CardanoStaking extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register() {
    this.registerMeta({
      name: 'Cardano Staking',
      slug: this.constructor.name,
      links: {
        /** no links */
      },
    });

    await this.registerProtocol<IProtocolMeta>(CardanoDelegation, {
      chain: ChainIdEnum.cardano,
      name: 'Cardano Delegation',
      feature: FeatureEnum.delegation,
    });
  }
}
