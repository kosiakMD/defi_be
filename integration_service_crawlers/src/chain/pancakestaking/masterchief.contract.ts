import { BigNumber } from 'bignumber.js';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { PANCAKE_MASTER_CHIEF_ABI } from './abi';
import { PANCAKE_MASTERCHIEF_ADDRESS } from './const';
import { PoolInfo } from './types';

export class MasterChiefContract {
  private contract: Contract;
  private web3: Web3;

  constructor(protected readonly web3Provider: Web3) {
    this.web3 = web3Provider;
    this.contract = new web3Provider.eth.Contract(
      PANCAKE_MASTER_CHIEF_ABI as AbiItem[],
      PANCAKE_MASTERCHIEF_ADDRESS,
    );
  }

  async poolInfo(id: number): Promise<PoolInfo> {
    const poolInfo = await this.contract.methods.poolInfo(id).call();
    return {
      lpToken: poolInfo.lpToken.toLowerCase(),
      allocPoint: new BigNumber(poolInfo.allocPoint),
      lastRewardBlock: new BigNumber(poolInfo.lastRewardBlock),
      accCakePerShare: new BigNumber(poolInfo.accCakePerShare),
    };
  }

  async poolLength(): Promise<number> {
    return this.contract.methods.poolLength().call();
  }
}
