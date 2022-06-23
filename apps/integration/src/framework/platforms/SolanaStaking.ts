import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { RootPlatform } from '../support/RootPlatform';
import { SolanaDelegation } from '../support/Solana/protocols/Yield/SolanaDelegation';
import { FeatureEnum } from '../support/enums';
import { IProtocolMeta } from '../support/interfaces';

/**
 * TODO: Should these be split up per chain so Platform.name can be i.e. 'Solana Delegators'
 */
export class SolanaStaking extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register() {
    this.registerMeta({
      name: 'Solana Staking',
      slug: this.constructor.name,
      links: {
        /** no links */
      },
    });

    await this.registerProtocol<IProtocolMeta>(SolanaDelegation, {
      chain: ChainIdEnum.sol,
      name: 'Solana Delegation',
      feature: FeatureEnum.delegation,
    });
  }
}
