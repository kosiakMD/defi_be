import { Connection } from '@solana/web3.js';
import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '@app/common/enum';

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
};

@Injectable()
export class Web3Provider {
  private readonly providers = {};

  constructor(private readonly configService: ConfigService) {
    this.initWeb3Providers();
    this.initConnectionProviders();
  }

  private initWeb3Providers() {
    Object.entries(ChainsProvidersUrls).forEach(([chainId, configName]) => {
      this.providers[chainId] = new Web3(this.configService.get<string>(configName));
    });
  }

  private initConnectionProviders() {
    this.providers[ChainIdEnum.sol] = new Connection(this.configService.get<string>('SOL_URL'));
  }

  public getInstanceByChainId(chain: ChainIdEnum): Web3 {
    return this.providers[chain];
  }

  public getInstance(chain: ChainIdEnum): Connection {
    return this.providers[chain];
  }
}
