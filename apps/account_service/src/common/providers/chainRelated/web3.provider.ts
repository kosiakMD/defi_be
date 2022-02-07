import { Connection } from '@solana/web3.js';
import { LCDClient } from '@terra-money/terra.js';
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AbsoluteChainIdEnum, ChainIdEnum } from '@app/common/enum';

const ChainsProvidersUrls = {
  [ChainIdEnum.arbi]: 'ARBITRUM_URL',
  [ChainIdEnum.avax]: 'AVAX_URL',
  [ChainIdEnum.boba]: 'BOBA_URL',
  [ChainIdEnum.bsc]: 'BSC_URL',
  [ChainIdEnum.celo]: 'CELO_URL',
  [ChainIdEnum.cro]: 'CRONOS_URL',
  [ChainIdEnum.eth]: 'ETH_URL',
  [ChainIdEnum.ftm]: 'FTM_URL',
  [ChainIdEnum.harm]: 'HARM_URL',
  [ChainIdEnum.heco]: 'HECO_URL',
  [ChainIdEnum.kcc]: 'KCC_URL',
  [ChainIdEnum.mriver]: 'MRIVER_URL',
  [ChainIdEnum.okex]: 'OKEX_URL',
  [ChainIdEnum.opt]: 'OPT_URL',
  [ChainIdEnum.plg]: 'POLYGON_URL',
  [ChainIdEnum.xdai]: 'XDAI_URL',
  [ChainIdEnum.near]: 'NEAR_URL',
  [ChainIdEnum.terra]: 'TERRA_URL',
  [ChainIdEnum.klay]: 'KLAYTN_URL',
  [ChainIdEnum.fuse]: 'FUSE_URL',
};

@Injectable()
export class Web3Provider {
  private readonly providers = {};

  constructor(private readonly configService: ConfigService) {
    this.initWeb3Providers();
    this.initConnectionProviders();
    this.initLCDProviders();
    this.initCardanoProviders();
  }

  private initWeb3Providers() {
    Object.entries(ChainsProvidersUrls).forEach(([chainId, configName]) => {
      this.providers[chainId] = new Web3(this.configService.get<string>(configName));
    });
  }

  private initConnectionProviders() {
    this.providers[ChainIdEnum.sol] = new Connection(this.configService.get<string>('SOL_URL'));
  }

  private initLCDProviders() {
    this.providers[ChainIdEnum.terra] = new LCDClient({
      URL: this.configService.get<string>('TERRA_URL'),
      chainID: AbsoluteChainIdEnum.terra.toString(),
    });
  }

  public initCardanoProviders() {
    this.providers[ChainIdEnum.cardano] = new BlockFrostAPI({
      projectId: this.configService.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    })
  }


  public getInstanceByChainId(chain: ChainIdEnum): Web3 {
    return this.providers[chain];
  }

  public getInstance(chain: ChainIdEnum): Connection {
    return this.providers[chain];
  }

  public getLCDInstance(chain: ChainIdEnum): LCDClient {
    return this.providers[chain];
  }

  public getCadronaInstance(chain: ChainIdEnum): BlockFrostAPI {
    return this.providers[chain];
  }
}
