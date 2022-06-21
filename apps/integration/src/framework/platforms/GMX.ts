import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { IMasterChefMeta, MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { IStakedGMXMeta, StakedGMX } from '../support/EVM/protocols/Yield/StakedGMX';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class GMX extends RootPlatform {
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
        telegram: 'https://t.me/GMX_IO',
        discord: 'https://discord.gg/cxjZYR4gQK',
        twitter: 'https://twitter.com/GMX_IO',
        url: 'https://gmx.io/',
        github: 'https://github.com/gmx-io',
      },
    });

    /**
     * Avax Test Account: https://debank.com/profile/0x7a8edc710ddeadddb0b539de83f3a306a621e823
     *
     * GMX => sbfGMX 1:1
     * - rewards: esGMX & AVAX
     *
     * GMX:
     * https://snowtrace.io/token/0x62edc0692bd897d2295872a9ffcac5425011c661
     *
     * staked GMX
     * https://snowtrace.io/address/0x2bd10f8e93b3669b6d42e74eeedc65dd1b0a1342#readContract
     * claimable => esGMX claimable
     *
     * Staked + Bonus GMX
     * https://snowtrace.io/address/0x908c4d94d34924765f1edc22a1dd098397c59dd4
     *
     * staked + bonus + fee GMX
     * https://snowtrace.io/address/0x4d268a7d4C16ceB5a606c173Bd974984343fea13#readContract
     * balanceOf, claimable
     *
     *
     * the second claimable is slightly delayed from the first :thinking:
     */
    await this.registerProtocol<IStakedGMXMeta>(StakedGMX, {
      chain: ChainIdEnum.avax,
      name: 'sbfGMX',
      feature: FeatureEnum.staking,
      token: '0x62edc0692bd897d2295872a9ffcac5425011c661',
      address: '0x4d268a7d4C16ceB5a606c173Bd974984343fea13',
      rewardContract: '0x2bd10f8e93b3669b6d42e74eeedc65dd1b0a1342',
    });
  }
}
