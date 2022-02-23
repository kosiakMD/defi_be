import { AbiItem } from 'web3-utils';
import { findInAbi } from '../helpers';
import { MasterchiefPancake } from './masterchief.pancake';

export interface CallInfo {
  id?: string
  target: string,
  abi: AbiItem,
  path: string,
  args?: any[]
}

export class MasterchiefTrisolaris extends MasterchiefPancake {
  //
  getRewardTokenCall(): CallInfo  {
    const minAbi: Partial<AbiItem> = {
      name: "tri",
    }
    const contractCallAbi = findInAbi(minAbi, this.abi);
    // return super.getRewardTokenCall()
    return {
      ...super.getRewardTokenCall(),
      abi: contractCallAbi,
    };
  }
}

