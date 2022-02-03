import { Injectable } from '@nestjs/common';

import { ContractsEntity } from '../entities/contracts.entity';
import { ChainStrategy } from './loaders/chain.strategy';

// this class must save vaults to our database without realtime data
@Injectable()
export class VaultLoaderDemo {
  // const

  constructor(private readonly chainStrategy: ChainStrategy) {}

  async initialLoad(contract: ContractsEntity) {
    console.log('loading demo');
    // here we don't know anything about this contract and we can define here
    // the template for it based on already integrated contracts
    // of example if function 'poolLength exists it is masterchief

    const vaults = await this.chainStrategy.load(contract);
    console.log(vaults);
    console.log('vaults');

    const poolLength = 2;
  }
}
