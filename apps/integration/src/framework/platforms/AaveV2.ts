import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { AaveV2Lending, IAaveV2Meta } from '../support/EVM/protocols/Lending/AaveV2Lending';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class AaveV2 extends RootPlatform {
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

    // AaveV1 check collateral:
    // https://etherscan.io/address/0x3dfd23a6c5e8bbcfc9581d2e864a68feb6a076d3#readProxyContract
    // isUserUseReserveAsCollateralEnabled

    await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
      chain: ChainIdEnum.eth,
      name: 'Lending - Aave',
      feature: FeatureEnum.lending,
      address: '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9',
      incentives: '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5',
    });

    await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
      chain: ChainIdEnum.plg,
      name: 'Lending - Aave',
      feature: FeatureEnum.lending,
      address: '0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf',
      incentives: '0x357D51124f59836DeD84c8a1730D72B749d8BC23',
    });

    await this.registerProtocol<IAaveV2Meta>(AaveV2Lending, {
      chain: ChainIdEnum.avax,
      name: 'Lending - Aave',
      feature: FeatureEnum.lending,
      address: '0x4F01AeD16D97E3aB5ab2B501154DC9bb0F1A5A2C',
      incentives: '0x01D83Fe6A10D2f2B7AF17034343746188272cAc9',
    });
  }
}
