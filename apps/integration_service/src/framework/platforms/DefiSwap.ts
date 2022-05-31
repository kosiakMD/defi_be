import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { DefiSwapLiquidity } from '../support/EVM/protocols/Liquidity/DefiSwapLiquidity';
import { DefiSwapLocked } from '../support/EVM/protocols/Locked/DefiSwapLocked';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class Defiswap extends RootPlatform {
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
        url: 'https://crypto.com/defi/swap',
        logo: 'https://crypto.com/favicon.png',
      },
    });

    await this.registerProtocol(DefiSwapLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Luquidity - DefiSwap',
      feature: FeatureEnum.pools,
      address: '0x9DEB29c9a4c7A88a3C0257393b7f3335338D9A9D',
    });

    //locked staking for 1 year
    await this.registerProtocol(DefiSwapLocked, {
      chain: ChainIdEnum.eth,
      name: 'Locked - DefiSwap - 1 year',
      feature: FeatureEnum.lockedBalances,
      address: '0x6aba3E56AEb3b95aD64161103D793fAc5F6ce4F7',
    });
    //locked staking for 2 year
    await this.registerProtocol(DefiSwapLocked, {
      chain: ChainIdEnum.eth,
      name: 'Locked - DefiSwap - 2 years',
      feature: FeatureEnum.lockedBalances,
      address: '0x26388d599A677C6A8BCc4c113F0A34e6Ced9493D',
    });
    //locked staking for 3 year
    await this.registerProtocol(DefiSwapLocked, {
      chain: ChainIdEnum.eth,
      name: 'Locked - DefiSwap - 3 years',
      feature: FeatureEnum.lockedBalances,
      address: '0x0A3c6EEC8408bdED9000DA65AfdB8a8fDA99E253',
    });
    //locked staking for 4 year
    await this.registerProtocol(DefiSwapLocked, {
      chain: ChainIdEnum.eth,
      name: 'Locked - DefiSwap - 4 years',
      feature: FeatureEnum.lockedBalances,
      address: '0x4f2bC163c8758D7F88771496F7B0Afde767045F3',
    });
  }
}
