import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Web3Provider {
  private readonly web3Eth;
  private readonly web3Bsc;
  constructor(private readonly configService: ConfigService) {
    this.web3Eth = new Web3(this.configService.get<string>('ETH_URL'));
    this.web3Bsc = new Web3(this.configService.get<string>('BSC_URL'));
  }
  instanceEth(): any {
    return this.web3Eth;
  }
  instanceBsc(): any {
    return this.web3Bsc;
  }
}
