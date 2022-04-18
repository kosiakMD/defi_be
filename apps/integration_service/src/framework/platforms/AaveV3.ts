import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';

import { AaveV3Lending } from '../support/EVM/protocols/Lending/AaveV3Lending';
import { RootPlatform } from '../support/RootPlatform';

export class AaveV3 extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register(): Promise<void> {
    this.registerMeta({
      name: this.constructor.name,
      project: this.constructor.name,
    });

    await this.registerProtocol(AaveV3Lending, {
      chain: ChainIdEnum.plg,
      name: 'Lending - Aave',
      feature: FeatureEnum.lending,
      address: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    });

    await this.registerProtocol(AaveV3Lending, {
      chain: ChainIdEnum.ftm,
      name: 'Lending - Aave',
      feature: FeatureEnum.lending,
      address: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    });

    await this.registerProtocol(AaveV3Lending, {
      chain: ChainIdEnum.arbi,
      name: 'Lending - Aave',
      feature: FeatureEnum.lending,
      address: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    });

    await this.registerProtocol(AaveV3Lending, {
      chain: ChainIdEnum.avax,
      name: 'Lending - Aave',
      feature: FeatureEnum.lending,
      address: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    });

    await this.registerProtocol(AaveV3Lending, {
      chain: ChainIdEnum.harm,
      name: 'Lending - Aave',
      feature: FeatureEnum.lending,
      address: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    });

    await this.registerProtocol(AaveV3Lending, {
      chain: ChainIdEnum.opt,
      name: 'Lending - Aave',
      feature: FeatureEnum.lending,
      address: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    });
  }
}
