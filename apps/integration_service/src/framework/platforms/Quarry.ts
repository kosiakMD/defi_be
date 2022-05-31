import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import { RootPlatform } from '../support/root-platform';
import { IQuarryMeta } from '../support/solana/protocols/yield/quarry/interfaces';
import { QuarryStaking } from '../support/solana/protocols/yield/quarry/quarry-staking';

export class Quarry extends RootPlatform {
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
        url: 'https://quarry.so',
        logo: 'https://icons.llama.fi/quarry.png',
        twitter: 'quarryprotocol',
      },
    });

    const endpointQuarry =
      'https://raw.githubusercontent.com/quarry-protocol/rewarder-list-build/master/mainnet-beta/all-rewarders-with-info.json';

    await this.registerProtocol<IQuarryMeta>(QuarryStaking, {
      chain: ChainIdEnum.sol,
      name: 'Quarry',
      feature: FeatureEnum.staking,
      context: {
        endpoint: endpointQuarry,
      },
    });
  }
}
