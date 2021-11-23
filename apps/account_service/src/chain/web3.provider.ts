import { Connection } from '@solana/web3.js';
import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '@app/common/enum';

@Injectable()
export class Web3Provider {
  private readonly providers = {};

  constructor(private readonly configService: ConfigService) {
    this.providers[ChainIdEnum.eth] = new Web3(this.configService.get<string>('ETH_URL'));
    this.providers[ChainIdEnum.bsc] = new Web3(this.configService.get<string>('BSC_URL'));
    this.providers[ChainIdEnum.plg] = new Web3(this.configService.get<string>('POLYGON_URL'));
    this.providers[ChainIdEnum.ftm] = new Web3(this.configService.get<string>('FTM_URL'));
    this.providers[ChainIdEnum.avax] = new Web3(this.configService.get<string>('AVAX_URL'));
    this.providers[ChainIdEnum.arbi] = new Web3(this.configService.get<string>('ARBITRUM_URL'));
    this.providers[ChainIdEnum.xdai] = new Web3(this.configService.get<string>('XDAI_URL'));
    this.providers[ChainIdEnum.celo] = new Web3(this.configService.get<string>('CELO_URL'));
    this.providers[ChainIdEnum.mriver] = new Web3(this.configService.get<string>('MRIVER_URL'));
    this.providers[ChainIdEnum.harm] = new Web3(this.configService.get<string>('HARM_URL'));
    this.providers[ChainIdEnum.heco] = new Web3(this.configService.get<string>('HECO_URL'));
    this.providers[ChainIdEnum.sol] = new Connection(this.configService.get<string>('SOL_URL'));
  }

  public getInstanceByChainId(chain: ChainIdEnum): Web3 {
    return this.providers[chain];
  }

  public getInstance(chain: ChainIdEnum): Connection {
    return this.providers[chain];
  }
}
