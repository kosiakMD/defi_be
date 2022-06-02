import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { CryptoComDefiSwapLiquidity } from '../support/EVM/protocols/Liquidity/CryptoComDefiSwapLiquidity';
import { CryptoComDefiSwapLocked } from '../support/EVM/protocols/Locked/CryptoComDefiSwapLocked';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class CryptoComDefiswap extends RootPlatform {
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

    await this.registerProtocol(CryptoComDefiSwapLiquidity, {
      chain: ChainIdEnum.eth,
      name: 'Luquidity - CryptoComDefiswap',
      feature: FeatureEnum.pools,
      address: '0x9DEB29c9a4c7A88a3C0257393b7f3335338D9A9D',
    });

    await this.registerProtocol(CryptoComDefiSwapLocked, {
      chain: ChainIdEnum.eth,
      name: 'Locked Staking - CryptoComDefiswap - 1 year',
      feature: FeatureEnum.staking,
      address: '0x6aba3E56AEb3b95aD64161103D793fAc5F6ce4F7',
    });

    await this.registerProtocol(CryptoComDefiSwapLocked, {
      chain: ChainIdEnum.eth,
      name: 'Locked Staking - CryptoComDefiswap - 2 years',
      feature: FeatureEnum.staking,
      address: '0x26388d599A677C6A8BCc4c113F0A34e6Ced9493D',
    });

    await this.registerProtocol(CryptoComDefiSwapLocked, {
      chain: ChainIdEnum.eth,
      name: 'Locked Staking - CryptoComDefiswap - 3 years',
      feature: FeatureEnum.staking,
      address: '0x0A3c6EEC8408bdED9000DA65AfdB8a8fDA99E253',
    });

    await this.registerProtocol(CryptoComDefiSwapLocked, {
      chain: ChainIdEnum.eth,
      name: 'Locked Staking - CryptoComDefiswap - 4 years',
      feature: FeatureEnum.staking,
      address: '0x4f2bC163c8758D7F88771496F7B0Afde767045F3',
    });
  }
}
