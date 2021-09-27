import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Injectable } from '@nestjs/common';

import { Address } from 'src/common/types';

import { QUICKSWAP_STAKING_REWARDS_ABI, QUICKSWAP_STAKING_TOKEN_ABI } from '../utils/abi';

@Injectable()
export class MultiCallService {
  private readonly web3 = new Web3(process.env.POLYGON_RPC_URL);

  async getBalanceOf(contractAddress: Address, accountAddress: Address): Promise<string> {
    const contract = new this.web3.eth.Contract(
      QUICKSWAP_STAKING_REWARDS_ABI as AbiItem[],
      contractAddress,
    );
    return await contract.methods.balanceOf(accountAddress).call();
  }

  async getClaimable(contractAddress: Address, accountAddress: Address): Promise<string> {
    const contract = new this.web3.eth.Contract(
      QUICKSWAP_STAKING_REWARDS_ABI as AbiItem[],
      contractAddress,
    );

    return await contract.methods.earned(accountAddress).call();
  }

  async getStakingTokensAddresses(contractAddress: Address): Promise<[Address, Address]> {
    const contract = new this.web3.eth.Contract(
      QUICKSWAP_STAKING_TOKEN_ABI as AbiItem[],
      contractAddress,
    );

    return [await contract.methods.token0().call(), await contract.methods.token1().call()];
  }
}
