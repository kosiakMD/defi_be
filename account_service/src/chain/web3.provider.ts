import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Web3 from 'web3';

@Injectable()
export class Web3Provider {
  private readonly web3Eth;
  private readonly web3Bsc;
  constructor(private readonly configSevice: ConfigService) {
    const ethUrl = this.configSevice.get<string>('ETH_URL');
    const bscUrl = this.configSevice.get<string>('BSC_URL');

    this.web3Eth = new Web3(ethUrl);
    this.web3Bsc = new Web3(bscUrl);
  }
  instanceEth(): any {
    return this.web3Eth;
  }
  instanceBsc(): any {
    return this.web3Bsc;
  }
}
