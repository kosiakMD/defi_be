import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { CakeVault, ICakeVaultMeta } from '../support/EVM/protocols/Yield/CakeVault';
import { IMasterChefMeta, MasterChef } from '../support/EVM/protocols/Yield/MasterChef';
import { StakingRewards } from '../support/EVM/protocols/Yield/StakingRewards';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';
import { MasterChefV2 } from '../support/EVM/protocols/Yield/MasterChefV2';

export class PancakeSwap extends RootPlatform {
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
        url: 'https://pancakeswap.finance/',
        logo: 'https://icons.llama.fi/pancakeswap.jpg',
        twitter: 'PancakeSwap',
      },
    });

    // TODO: This single pool has not yet been implemented
    // await this.registerProtocol(StakingRewards, {
    //   chain: ChainIdEnum.bnb,
    //   name: 'IFO CAKE',
    //   feature: FeatureEnum.staking,
    //   address: '0x1B2A2f6ed4A1401E8C73B4c2B6172455ce2f78E8',
    // });

    // Custom single autocompounding vault (compounds pool 0 of masterchef below)
    // TODO: when pools are saved to cache, instead of calculating APR again here
    // just grab masterchef from cache
    await this.registerProtocol<ICakeVaultMeta>(CakeVault, {
      chain: ChainIdEnum.bnb,
      name: 'Auto CAKE',
      feature: FeatureEnum.staking,
      address: '0xa80240Eb5d7E05d3F250cF000eEc0891d00b51CC',
      context: { poolId: 0 },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChef, {
      chain: ChainIdEnum.bnb,
      name: 'Farms - Masterchef',
      feature: FeatureEnum.staking,
      address: '0x73feaa1eE314F8c655E354234017bE2193C9E24E',
      context: {
        badPools: [105, 444, 514, 515, 516, 517, 518, 519, 520, 521],
      },
    });

    await this.registerProtocol<IMasterChefMeta>(MasterChefV2, {
      chain: ChainIdEnum.bnb,
      name: 'Farms - MasterchefV2',
      feature: FeatureEnum.staking,
      address: '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652',
    });

    // TODO: Unpredictable errors. Seem to be related to the screen scraping
    await this.registerProtocol(StakingRewards, {
      chain: ChainIdEnum.bnb,
      name: 'Active Pools',
      feature: FeatureEnum.staking,
      scrape: {
        url: 'https://raw.githubusercontent.com/pancakeswap/pancake-frontend/develop/src/config/constants/pools.tsx',
        //     // Returns a list of all available pools
        handler: async () => {
          // scrapes typescript from github
          return document.body.innerText
            .split('\n')
            .map((a) => a.trim())
            .filter((a) => a.startsWith('56:'))
            .map((a) => a.replace(/56: '(0x[\w]{40})',/, '$1'))
            .slice(1) // first is masterchef
            .slice(0, 154); // after this its a different format 155-264?
        },
      },
    });

    await this.registerProtocol(StakingRewards, {
      chain: ChainIdEnum.bnb,
      name: 'Active Pools',
      feature: FeatureEnum.staking,
      scrape: {
        url: 'https://raw.githubusercontent.com/pancakeswap/pancake-frontend/develop/src/config/constants/pools.tsx',
        //     // Returns a list of all available pools
        handler: async () => {
          // scrapes typescript from github
          return document.body.innerText
            .split('\n')
            .map((a) => a.trim())
            .filter((a) => a.startsWith('56:'))
            .map((a) => a.replace(/56: '(0x[\w]{40})',/, '$1'))
            .slice(1, 157); // after this its a different format 155-264?
        },
      },
    });

    // await this.registerProtocol(StakingRewards, {
    //   chain: ChainIdEnum.bnb,
    //   name: 'Active Pools',
    //   feature: FeatureEnum.staking,
    //   scrape: {
    //     url: 'https://raw.githubusercontent.com/pancakeswap/pancake-frontend/develop/src/config/constants/pools.tsx',
    //     //     // Returns a list of all available pools
    //     handler: async () => {
    //       // scrapes typescript from github
    //       return document.body.innerText
    //         .split('\n')
    //         .map((a) => a.trim())
    //         .filter((a) => a.startsWith('56:'))
    //         .map((a) => a.replace(/56: '(0x[\w]{40})',/, '$1'))
    //         .slice(157); // first is masterchef
    //       // .slice(155, 160); // after this its a different format 155-264?
    //     }, // 157. 156
    //   },
    // });

    // TODO: Clean up these comments, may be needed for now,
    // but will likely go with the above version when fixed

    // Works but very slow, hard to save a generic 'config'
    // infinite scroll seems to need 'smooth scrolling' to load all pools properly
    // Scrapes current page of pools
    // handler: async () => {
    //       const wait = (ms = 1500) => new Promise((ok) => setTimeout(ok, ms));
    //       // InfinityLoader
    //       let height;
    //       do {
    //         height = document.body.scrollHeight;
    //         window.scrollTo({
    //           top: document.body.scrollHeight,
    //           left: 0,
    //           behavior: 'smooth',
    //         });
    //         await wait();
    //       } while (height !== document.body.scrollHeight);
    //       await wait();

    //       // Click to open all panels
    //       Array.from(document.querySelectorAll('#pools-table div[role=row]')).forEach((el: any) =>
    //         el.click(),
    //       );
    //       await wait();

    //       // Selected the 'View Contract' button and grab the address
    //       return Array.from(
    //         document.querySelectorAll(
    //           // Pools Page
    //           '#pools-table div[role=row] + div > div > div:first-child + div + div + div > a[href^="https://bscscan.com/address/"]',
    //           // 'a',
    //           // History Page
    //           // '#pools-table div[role=row] + div > div > div:first-child + div + div > a[href^="https://bscscan.com/address"]',
    //         ),
    //       ).map((a: any) => a.href.replace('https://bscscan.com/address/', ''));
    //     },
    //   },
    // });
  }
}
