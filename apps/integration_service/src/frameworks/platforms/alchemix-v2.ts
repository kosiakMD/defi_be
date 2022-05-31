import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { FeatureEnum } from '../support/enums';
import { CombinedMultiContractProtocolMeta } from '../support/evm/combined-multi-contract-protocol';
import { AlchemixV2Vaults } from '../support/evm/protocols/lending/alchemix-v2-vaults';
import { RootPlatform } from '../support/root-platform';

export class AlchemixV2 extends RootPlatform {
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
        url: 'https://alchemix.fi/',
        logo: 'https://icons.llama.fi/alchemix.jpg',
        twitter: 'AlchemixFi',
      },
    });

    await this.registerProtocol<CombinedMultiContractProtocolMeta>(AlchemixV2Vaults, {
      chain: ChainIdEnum.eth,
      name: 'Lending - AlchemixV2Stable - allUSD',
      feature: FeatureEnum.lending,
      address: '0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd',
      poolsPredicate: 'supportedYieldTokens',
    });

    await this.registerProtocol<CombinedMultiContractProtocolMeta>(AlchemixV2Vaults, {
      chain: ChainIdEnum.eth,
      name: 'Lending - AlchemixV2Stable - allETH',
      feature: FeatureEnum.lending,
      address: '0x062Bf725dC4cDF947aa79Ca2aaCCD4F385b13b5c',
      poolsPredicate: 'supportedYieldTokens',
    });
  }
}
