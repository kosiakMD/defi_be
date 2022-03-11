import { AbiItem } from 'web3-utils';
import { ChainConfigurable } from '../chain-configurable';
import { DEFAULT_CONFIG as config } from './config';
import { findMatchInAbi } from '../helpers';
import { CallInfo } from '../chief/masterchief.base';

export class SingleChiefBase extends ChainConfigurable {

  public implementationId = 'singlechiefbase';

  protected readonly address;
  protected readonly abi: AbiItem[];
  protected readonly config;

  constructor(address, abi, config?) {
    super();
    this.address = address;
    this.abi = abi;
    this.config = config;
    if (!this.confirmChainConfiguration()) {
      throw new Error(`Not possible to make instance of class ${SingleChiefBase.name}`)
    }
  }

  confirmChainConfiguration() {
    return Boolean(this.getRewardTokenCall())
      && Boolean(this.getStakingTokenCall());
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

  getStakingTokenCall(): CallInfo {
    const contractCallAbi = findMatchInAbi(config.stakingTokenCalls, this.abi);
    return {
      id: this.address + ':' + contractCallAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: '',
    };
  }
}

