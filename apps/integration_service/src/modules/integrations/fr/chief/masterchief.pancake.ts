import { AbiItem } from 'web3-utils';
import { findInAbi } from '../helpers';

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

export class MasterchiefPancake {
  protected readonly address;
  protected readonly abi: AbiItem[];
  private config: any;

  constructor(address, abi) {
    this.address = address;
    this.abi = abi;
    // this.config = config;
  }

  // static collectCalls() {
  //
  // }

  // static confirmTemplate(abi) {
  //   // todo: logic to confirm that abi has required data
  //   return true;
  // }

  getRewardTokenCall(): CallInfo  {
    const minAbi: Partial<AbiItem> = {
      name: "cake",
    }
    // config or default value
    // config has rule to match method
    // get config in constructor
    const contractCallAbi = findInAbi(minAbi, this.abi);
    return {
      id: this.address + ':' + minAbi.name,
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

