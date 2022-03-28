import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { Connection } from '@solana/web3.js';
import { LCDClient } from '@terra-money/terra.js';
import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AbsoluteChainIdEnum, ChainNameEnum } from '@app/common/enum';
import { ChainsService } from 'apps/account_service/src/modules/chains/chains.service';

const ChainsProvidersUrls: Partial<Record<number, string>> = {
  5: 'ARBITRUM_URL',
  6: 'AVAX_URL',
  15: 'BOBA_URL',
  2: 'BSC_URL',
  8: 'CELO_URL',
  14: 'CRONOS_URL',
  1: 'ETH_URL',
  4: 'FTM_URL',
  10: 'HARM_URL',
  11: 'HECO_URL',
  16: 'KCC_URL',
  9: 'MRIVER_URL',
  13: 'OKEX_URL',
  17: 'OPT_URL',
  3: 'POLYGON_URL',
  7: 'GNOSIS_URL',
  18: 'NEAR_URL',
  19: 'TERRA_URL',
  20: 'KLAYTN_URL',
  21: 'FUSE_URL',
  23: 'METIS_URL',
  24: 'RONIN_URL',
};

@Injectable()
export class Web3Provider {
  private readonly providers = {};

  constructor(private readonly configService: ConfigService, private readonly chainsService: ChainsService) {
    this.initWeb3Providers();
    this.initConnectionProviders();
    this.initLCDProviders();
    this.initCardanoProviders();
  }

  public initCardanoProviders() {
    this.providers[22] = new BlockFrostAPI({
      projectId: this.configService.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    });
  }

  public getInstanceByChainId(chain: number) {
    return this.providers[chain];
  }

  public getInstance(chain: number): Connection {
    return this.providers[chain];
  }

  public getCardanoInstance(chain: number): BlockFrostAPI {
    return this.providers[chain];
  }

  private initWeb3Providers() {
    Object.entries(ChainsProvidersUrls).forEach(([chainId, configName]) => {
      this.providers[chainId] = new Web3(this.configService.get<string>(configName));
    });
  }

  private async initConnectionProviders() {
    const chainId = await this.chainsService.getChainIdByName(ChainNameEnum.sol)
    this.providers[chainId] = new Connection(this.configService.get<string>('SOL_URL'));
  }

  private async initLCDProviders() {
    const chainId = await this.chainsService.getChainIdByName(ChainNameEnum.cardano)
    this.providers[chainId] = new LCDClient({
      URL: this.configService.get<string>('TERRA_URL'),
      chainID: AbsoluteChainIdEnum.terra.toString(),
    });
  }
}
