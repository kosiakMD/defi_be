import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MulticallContract } from './contract/multicall.contract';

@Injectable()
export class Web3Provider {
  readonly web3: Web3;
  readonly multicall: MulticallContract;

  constructor(private readonly configService: ConfigService) {
    this.web3 = new Web3(this.configService.get<string>('RPC_URL'));
    const contract = this.configService.get<string>('MULTICALL_CONTRACT');

    this.multicall = new MulticallContract(this.web3, contract);
  }
}
