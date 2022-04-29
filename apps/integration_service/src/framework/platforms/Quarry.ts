import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { RootPlatform } from '../support/RootPlatform';
import { QuarryStaking } from '../support/Solana/protocols/Yield/Quarry/QuarryStaking';

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
      project: this.constructor.name,
    });
    const endpointQuarry =
      'https://gist.githubusercontent.com/x-ror/e0726d93bcc62b4ff5583479a5b79795/raw/';
    // const endpointQuarry = 'https://api.sonar.watch/latest/farms';

    await this.registerProtocol(QuarryStaking, {
      chain: ChainIdEnum.sol,
      name: 'Quarry',
      feature: FeatureEnum.staking,
      api: {
        endpoint: endpointQuarry,
      },
    });
  }
}
