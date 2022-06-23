import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { KavaLendClaimable } from '../support/CosmosHub/protocols/Claimable/KavaLendClaimable';
import { KavaLending } from '../support/CosmosHub/protocols/Lending/KavaLending';
import { IKavaMeta as IKavaMetaClaimable } from '../support/CosmosHub/protocols/interfaces/Kava/KavaClaimable';
import { IKavaMeta as IKavaMetaLending } from '../support/CosmosHub/protocols/interfaces/Kava/KavaLending';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class KavaLend extends RootPlatform {
  private KAVA_API: string;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
    protected configService: ConfigService,
  ) {
    super();
    this.KAVA_API = this.configService.get<string>('KAVA_API');
  }

  async register() {
    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://www.kava.io',
        logo: 'https://icons.llama.fi/kava.png',
        twitter: 'kava_platform',
      },
    });

    await this.registerProtocol<IKavaMetaLending>(KavaLending, {
      chain: ChainIdEnum.kava,
      name: 'Kava Lending',
      feature: FeatureEnum.lending,
      context: {
        endpoint: this.KAVA_API,
      },
    });

    await this.registerProtocol<IKavaMetaClaimable>(KavaLendClaimable, {
      chain: ChainIdEnum.kava,
      name: 'Kava Claimable',
      feature: FeatureEnum.claimable,
      context: {
        endpoint: this.KAVA_API,
      },
    });
  }
}
