import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { BeefyVault, IBeefyVaultMeta } from '../support/EVM/protocols/Yield/BeefyVault';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

export class BeefyFinance extends RootPlatform {
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
        telegram: 'https://t.me/beefyfinance',
        twitter: 'https://twitter.com/BeefyFinance/',
        url: 'https://beefy.finance/',
        github: 'https://github.com/beefyfinance/',
      },
    });

    await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
      chain: ChainIdEnum.bnb,
      name: 'BeefyVault',
      feature: FeatureEnum.staking,
      address: '0x7828ff4ABA7aAb932D8407C78324B069D24284c9', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'bsc',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });

    // await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
    //   chain: ChainIdEnum.plg,
    //   name: 'BeefyVault',
    //   feature: FeatureEnum.staking,
    //   address: '0xFcC42a103d620125b580a0B76fD8a58cc1b6b06A', // Randomly chosen vault to fetch ABI from
    //   context: {
    //     chainEndpoint: 'polygon',
    //     vaultEndpoint: 'https://api.beefy.finance/vaults',
    // apyEndpoint: 'https://api.beefy.finance/apy',
    //   },
    // });

    // await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
    //   chain: ChainIdEnum.celo,
    //   name: 'BeefyVault',
    //   feature: FeatureEnum.staking,
    //   address: '0xf68c61e3c2f9c48e53391e1fcd2db1f19998151b', // Randomly chosen vault to fetch ABI from
    //   context: {
    //     chainEndpoint: 'celo',
    //     vaultEndpoint: 'https://api.beefy.finance/vaults',
    // apyEndpoint: 'https://api.beefy.finance/apy',
    //   },
    // });

    // await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
    //   chain: ChainIdEnum.arbi,
    //   name: 'BeefyVault',
    //   feature: FeatureEnum.staking,
    //   address: '0x78AB636351c1C5f117C1442B82d14aB3a92F8464', // Randomly chosen vault to fetch ABI from
    //   context: {
    //     chainEndpoint: 'arbitrum',
    //     vaultEndpoint: 'https://api.beefy.finance/vaults',
    // apyEndpoint: 'https://api.beefy.finance/apy',
    //   },
    // });

    // await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
    //   chain: ChainIdEnum.avax,
    //   name: 'BeefyVault',
    //   feature: FeatureEnum.staking,
    //   address: '0xCeefB07Ad37ff165A0b03DC7C808fD2E2fC77683', // Randomly chosen vault to fetch ABI from
    //   context: {
    //     chainEndpoint: 'avax',
    //     vaultEndpoint: 'https://api.beefy.finance/vaults',
    // apyEndpoint: 'https://api.beefy.finance/apy',
    //   },
    // });

    // await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
    //   chain: ChainIdEnum.cro,
    //   name: 'BeefyVault',
    //   feature: FeatureEnum.staking,
    //   address: '0xBa5041B1c06e8c9cFb5dDB4b82BdC52E41EA5FC5', // Randomly chosen vault to fetch ABI from
    //   context: {
    //     chainEndpoint: 'cronos',
    //     vaultEndpoint: 'https://api.beefy.finance/vaults',
    // apyEndpoint: 'https://api.beefy.finance/apy',
    //   },
    // });

    // await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
    //   chain: ChainIdEnum.ftm,
    //   name: 'BeefyVault',
    //   feature: FeatureEnum.staking,
    //   address: '0x185647c55633A5706aAA3278132537565c925078', // Randomly chosen vault to fetch ABI from
    //   context: {
    //     chainEndpoint: 'fantom',
    //     vaultEndpoint: 'https://api.beefy.finance/vaults',
    // apyEndpoint: 'https://api.beefy.finance/apy',
    //   },
    // });

    // await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
    //   chain: ChainIdEnum.harm,
    //   name: 'BeefyVault',
    //   feature: FeatureEnum.staking,
    //   address: '0x06A1f520555222758eaE4dA0573351FdaD1e7843', // Randomly chosen vault to fetch ABI from
    //   context: {
    //     chainEndpoint: 'one',
    //     vaultEndpoint: 'https://api.beefy.finance/vaults',
    // apyEndpoint: 'https://api.beefy.finance/apy',
    //   },
    // });

    // await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
    //   chain: ChainIdEnum.mriver,
    //   name: 'BeefyVault',
    //   feature: FeatureEnum.staking,
    //   address: '0xc9a509dA14525Ad3710e9448a0839EE2e90E48B1', // Randomly chosen vault to fetch ABI from
    //   context: {
    //     chainEndpoint: 'moonriver',
    //     vaultEndpoint: 'https://api.beefy.finance/vaults',
    // apyEndpoint: 'https://api.beefy.finance/apy',
    //   },
    // });
  }
}
