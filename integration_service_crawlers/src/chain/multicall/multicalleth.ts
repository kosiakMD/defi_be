import { MultiCall } from '@indexed-finance/multicall';

import { Injectable } from '@nestjs/common';

import { Web3Provider } from '../web3.provider';

@Injectable()
export class MulticallEth extends MultiCall {
  constructor(protected readonly web3Instance: Web3Provider) {
    super(web3Instance.instanceEth());
  }
}
