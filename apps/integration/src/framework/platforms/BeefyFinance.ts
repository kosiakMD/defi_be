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
      address: '0x7828ff4aba7aab932d8407c78324b069d24284c9', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'bsc',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });

    await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
      chain: ChainIdEnum.plg,
      name: 'BeefyVault',
      feature: FeatureEnum.staking,
      address: '0xfcc42a103d620125b580a0b76fd8a58cc1b6b06a', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'polygon',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });

    await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
      chain: ChainIdEnum.celo,
      name: 'BeefyVault',
      feature: FeatureEnum.staking,
      address: '0xf68c61e3c2f9c48e53391e1fcd2db1f19998151b', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'celo',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });

    await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
      chain: ChainIdEnum.arbi,
      name: 'BeefyVault',
      feature: FeatureEnum.staking,
      address: '0x78ab636351c1c5f117c1442b82d14ab3a92f8464', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'arbitrum',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });

    await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
      chain: ChainIdEnum.avax,
      name: 'BeefyVault',
      feature: FeatureEnum.staking,
      address: '0xceefb07ad37ff165a0b03dc7c808fd2e2fc77683', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'avax',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });

    await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
      chain: ChainIdEnum.cro,
      name: 'BeefyVault',
      feature: FeatureEnum.staking,
      address: '0xba5041b1c06e8c9cfb5ddb4b82bdc52e41ea5fc5', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'cronos',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });

    await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
      chain: ChainIdEnum.ftm,
      name: 'BeefyVault',
      feature: FeatureEnum.staking,
      address: '0x185647c55633a5706aaa3278132537565c925078', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'fantom',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });

    await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
      chain: ChainIdEnum.harm,
      name: 'BeefyVault',
      feature: FeatureEnum.staking,
      address: '0x06a1f520555222758eae4da0573351fdad1e7843', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'one',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });

    await this.registerProtocol<IBeefyVaultMeta>(BeefyVault, {
      chain: ChainIdEnum.mriver,
      name: 'BeefyVault',
      feature: FeatureEnum.staking,
      address: '0xc9a509da14525ad3710e9448a0839ee2e90e48b1', // Randomly chosen vault to fetch ABI from
      context: {
        chainEndpoint: 'moonriver',
        vaultEndpoint: 'https://api.beefy.finance/vaults',
        apyEndpoint: 'https://api.beefy.finance/apy',
      },
    });
  }
}
