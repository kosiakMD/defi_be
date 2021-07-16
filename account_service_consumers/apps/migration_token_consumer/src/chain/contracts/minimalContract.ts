import { Injectable } from '@nestjs/common';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { AssetsEntity } from '../../store/entities/assets.entity';
import { Web3Provider } from '../web3.provider';
import { ERC20_ABI } from './abi';

// events: https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html#events
@Injectable()
export class MinEthContract {
  private ETHProvider: Web3;
  private contract;

  constructor(private readonly chainProvider: Web3Provider) {
    this.ETHProvider = this.chainProvider.instanceEth();
  }

  async getContractData(address: string): Promise<Partial<AssetsEntity>> {
    this.contract = new this.ETHProvider.eth.Contract(ERC20_ABI as AbiItem[], address);
    const name = await this.contract.methods.name().call();
    const symbol = await this.contract.methods.symbol().call();
    const decimals = await this.contract.methods.decimals().call();
    return {
      name,
      symbol,
      decimals,
    };
  }
}
