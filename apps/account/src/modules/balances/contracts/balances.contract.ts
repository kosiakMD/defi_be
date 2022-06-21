import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import { Address } from '@app/common';

import { BlockTimestamp } from '../../../common/services/blocktime.service';

import { BALANCES_ABI } from './balances.contract.abi';

export class BalancesContract {
  protected contract: Contract;

  constructor(address: Address, web3: Web3) {
    this.contract = new web3.eth.Contract(BALANCES_ABI, address);
  }

  async getBalances(address: Address, tokens: string[], block?: BlockTimestamp): Promise<string[]> {
    return this.contract.methods.getBalances(address, tokens).call(undefined, block?.block);
  }
}
