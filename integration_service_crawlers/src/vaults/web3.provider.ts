import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Web3 from 'web3';

@Injectable()
export class Web3Provider {
  private readonly providerUrl: string;
  private readonly web3;
  constructor(private readonly configSevice: ConfigService) {
    this.providerUrl = this.configSevice.get<string>('ETH_URL');
    this.web3 = new Web3(this.providerUrl);
  }
  instance(): any {
    return this.web3;
  }
}
