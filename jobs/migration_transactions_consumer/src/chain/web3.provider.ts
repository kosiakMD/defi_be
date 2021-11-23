import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Web3Provider {
  private readonly web3Eth;
  constructor(private readonly configService: ConfigService) {
    const ethUrl = this.configService.get<string>('ETH_URL');

    this.web3Eth = new Web3(ethUrl);
  }
  instanceEth(): any {
    return this.web3Eth;
  }
}
