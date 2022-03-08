import { AbiItem } from 'web3-utils';
import { findInAbi, findMatchInAbi } from '../helpers';
import { DEFAULT_CONFIG as config } from './config';

export interface CallInfo {
  id?: string
  target: string,
  abi: AbiItem,
  path: string,
  args?: any[]
}

enum TemplatedArgs {
  PoolId = 'poolId',
}

export class MasterchiefBase {

  protected readonly address;
  protected readonly abi: AbiItem[];

  constructor(address, abi) {
    this.address = address;
    this.abi = abi;
  }

  getRewardTokenCall(): CallInfo  {
    const contractCallAbi = findMatchInAbi(config.rewardTokenCalls, this.abi);
    return {
      id: this.address + ':' + contractCallAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: ''
    };
  }

  getPoolLengthCall(): CallInfo {
    const minAbi: Partial<AbiItem> = {
      name: "poolLength",
    }
    const contractCallAbi = findInAbi(minAbi, this.abi);
    return {
      id: this.address + ':' + minAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: ''
    };
  }

  getStakingTokenCall(): CallInfo {
    const minAbi: Partial<AbiItem> = {
      name: "poolInfo",
      inputs: [
        {
          name: "",
          type: "uint256",
        }
      ],
      outputs: [
        {
          name: "lpToken",
          type: "address",
        }
      ]
    }
    const contractCallAbi = findInAbi(minAbi, this.abi);
    return {
      id: this.address + ':' + minAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: 'lpToken',
      args: [TemplatedArgs.PoolId]
    };
  }
}

