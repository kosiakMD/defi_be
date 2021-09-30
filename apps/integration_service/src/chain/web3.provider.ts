import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '@app/common/enum';

@Injectable()
export class Web3Provider {
  public readonly web3Map: Map<ChainIdEnum, Web3> = new Map<ChainIdEnum, Web3>();

  constructor(private readonly configService: ConfigService) {
    this.web3Map.set(ChainIdEnum.bsc, new Web3(this.configService.get<string>('BSC_URL')));
    this.web3Map.set(ChainIdEnum.eth, new Web3(this.configService.get<string>('ETH_URL')));
    this.web3Map.set(ChainIdEnum.ftm, new Web3(this.configService.get<string>('FTM_RPC_URL')));
  }

  instanceEth(): Web3 {
    return this.web3Map.get(ChainIdEnum.eth);
  }

  instanceBsc(): Web3 {
    return this.web3Map.get(ChainIdEnum.bsc);
  }

  instanceFtm(): Web3 {
    return this.web3Map.get(ChainIdEnum.ftm);
  }
}
