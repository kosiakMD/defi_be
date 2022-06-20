import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { UnicryptFarm } from '../support/EVM/protocols/Yield/UnicryptFarm';
import { RootPlatform } from '../support/RootPlatform';
import { FeatureEnum } from '../support/enums';

/**
 * @notice Currently disabled until method for fetching user rewards is found
 * Contracts are unverified, and no docs are available
 */
export class Unicrypt extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register() {
    /**
     * Docs
     *
     * ETH farms
     * POST https://api-chain-eth.unicrypt.network/api/v1/farms/search
     * {"filters":{"sort":"tvl","sortAscending":false},"page":0,"rows_per_page":12}
     * GET https://api-chain-eth.unicrypt.network/api/v1/farms/tvl
     * GET https://api-chain-eth.unicrypt.network/api/v1/farms/farm/0xdF002f150cEeAC6b5F5DC1FD55621D1491A30256 // farm address
     *
     * BSC
     * https://api-chain-bsc.unicrypt.network/api/v1/farms/search
     * https://api-chain-bsc.unicrypt.network/api/v1/farms/tvl
     *
     * unused and testnet
     * https://api-chain-avax.unicrypt.network/api/v1/farms/search
     * https://api-chain-kovan.unicrypt.network/api/v1/farms/search
     */

    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://app.unicrypt.network/',
        logo: 'https://icons.llama.fi/unicrypt.png',
        twitter: 'https://twitter.com/UNCX_token',
        telegram: 'https://t.me/uncx_token',
      },
    });

    /**
     * tx: https://etherscan.io/tx/0xhttps://2891243240-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MjoGoMS0wqMF7Accm3h%2Ficon%2F494cdRSp1ekeTJJgMFlv%2FIcon.png?alt=mediab09ba497636c3c2abcf1f39bf8d0d4e84548cdc76ec59fb25c74b708b4d8b799
     * user: 0x6ecc6c5aabafafd5d246bfc5e34872f3efa0872b
     */
    await this.registerProtocol(UnicryptFarm, {
      name: 'Unicrypt Farms',
      chain: ChainIdEnum.eth,
      feature: FeatureEnum.staking,
      context: {
        search: 'https://api-chain-eth.unicrypt.network/api/v1/farms/search',
      },
    });

    await this.registerProtocol(UnicryptFarm, {
      name: 'Unicrypt Farms',
      chain: ChainIdEnum.bnb,
      feature: FeatureEnum.staking,
      context: {
        search: 'https://api-chain-bsc.unicrypt.network/api/v1/farms/search',
      },
    });
  }
}
