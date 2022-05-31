import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { KavaClaimable } from '../support/cosmos-hub/protocols/claimable/kava-claimable';
import { IKavaMeta as IKavaMetaClaimable } from '../support/cosmos-hub/protocols/interfaces/kava/kava-claimable';
import { IKavaMeta as IKavaMetaLending } from '../support/cosmos-hub/protocols/interfaces/kava/kava-lending';
import { IKavaMeta as IKavaMetaLiquidity } from '../support/cosmos-hub/protocols/interfaces/kava/kava-liquidity';
import { KavaLending } from '../support/cosmos-hub/protocols/lending/kava-lending';
import { KavaLiquidity } from '../support/cosmos-hub/protocols/liquidity/kava-liquidity';
import { FeatureEnum } from '../support/enums';
import { RootPlatform } from '../support/root-platform';

export class Kava extends RootPlatform {
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

    await this.registerProtocol<IKavaMetaLiquidity>(KavaLiquidity, {
      chain: ChainIdEnum.kava,
      name: 'Kava Liquidity',
      feature: FeatureEnum.pools,
      context: {
        endpoint: this.KAVA_API,
      },
    });

    await this.registerProtocol<IKavaMetaClaimable>(KavaClaimable, {
      chain: ChainIdEnum.kava,
      name: 'Kava Claimable',
      feature: FeatureEnum.claimable,
      context: {
        endpoint: this.KAVA_API,
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
  }
}
