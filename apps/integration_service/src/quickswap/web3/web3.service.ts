import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { Injectable } from '@nestjs/common';

import { Address } from '@app/common';

import { QUICKSWAP_STAKING_REWARDS_ABI, QUICKSWAP_STAKING_TOKEN_ABI } from '../utils/abi';

@Injectable()
export class Web3Service {
  private readonly web3 = new Web3(process.env.POLYGON_RPC_URL);

  private _getContract(contractAddress: Address, ABI = QUICKSWAP_STAKING_REWARDS_ABI): Contract {
    return new this.web3.eth.Contract(ABI as AbiItem[], contractAddress);
  }

  async getBalanceOf(contractAddress: Address, accountAddress: Address): Promise<string> {
    const contract = this._getContract(contractAddress);
    return await contract.methods.balanceOf(accountAddress).call();
  }

  async getClaimable(contractAddress: Address, accountAddress: Address): Promise<string> {
    const contract = this._getContract(contractAddress);
    return await contract.methods.earned(accountAddress).call();
  }

  async getStakingTokensAddresses(contractAddress: Address): Promise<[Address, Address]> {
    const contract = this._getContract(contractAddress, QUICKSWAP_STAKING_TOKEN_ABI);
    return [await contract.methods.token0().call(), await contract.methods.token1().call()];
  }
}
