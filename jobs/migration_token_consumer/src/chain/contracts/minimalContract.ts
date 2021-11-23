import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Injectable } from '@nestjs/common';

import { AssetsEntity } from '../../store/entities/assets.entity';
import { CHAIN_ID_ETH } from '../../util/util';
import { Web3Provider } from '../web3.provider';
import { ERC20_ABI } from './abi';

// events: https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html#events
@Injectable()
export class MinEthContract {
  private ETHProvider: Web3;
  private BSCProvider: Web3;
  private contract;

  constructor(private readonly chainProvider: Web3Provider) {
    this.ETHProvider = this.chainProvider.instanceEth();
    this.BSCProvider = this.chainProvider.instanceBsc();
  }

  async getContractData(address: string, chainId = CHAIN_ID_ETH): Promise<Partial<AssetsEntity>> {
    return chainId === CHAIN_ID_ETH
      ? await this.getEthContractData(address)
      : await this.getBscContractData(address);
  }

  async getEthContractData(address: string): Promise<Partial<AssetsEntity>> {
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

  async getBscContractData(address: string): Promise<Partial<AssetsEntity>> {
    this.contract = new this.BSCProvider.eth.Contract(ERC20_ABI as AbiItem[], address);
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
