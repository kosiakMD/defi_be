import { AbiItem } from 'web3-utils';
import { ChainConfigurable } from '../chain-configurable';

export class SingleChief extends ChainConfigurable {

  protected readonly address;
  protected readonly abi: AbiItem[];

  constructor(address, abi) {
    super();
    this.address = address;
    this.abi = abi;
    if (!this.confirmChainConfiguration()) {
      throw new Error(`Not possible to make instance of class ${SingleChief.name}`)
    }
  }

  confirmChainConfiguration() {
    return false;
  }
}

