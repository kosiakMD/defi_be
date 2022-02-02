import { Injectable } from '@nestjs/common';

import { ContractsEntity } from '../entities/contracts.entity';

@Injectable()
export class VaultLoaderDemo {
  constructor() {}

  initialLoad(contract: ContractsEntity) {
    // here we don't know anything about this contract and we can define here
    // the template for it based on already integrated contracts
    // of example if function 'poolLength exists it is masterchief

    const poolLength = 2;
  }
}
