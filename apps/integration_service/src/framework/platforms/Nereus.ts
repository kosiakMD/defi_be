import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { AaveV2Lending, IAaveV2Meta } from '../support/EVM/protocols/Lending/AaveV2Lending';
import { MasterChefNeureus } from '../support/EVM/protocols/Yield/MasterChefNeureus';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Nereus extends RootPlatform {
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

    await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
      chain: ChainIdEnum.avax,
      name: 'Lending - Nereus',
      feature: FeatureEnum.lending,
      address: '0xb9257597eddfa0ecaff04ff216939fbc31aac026',
    });

    await this.registerProtocol(MasterChefNeureus, {
      chain: ChainIdEnum.avax,
      name: 'Lending - Nereus',
      feature: FeatureEnum.staking,
      address: '0xa57a8C5dd29bd9CC605027E62935db2cB5485378',
    });
  }
}
