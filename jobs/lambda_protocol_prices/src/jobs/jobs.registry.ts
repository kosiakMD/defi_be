import { Injectable } from '@nestjs/common';

import { CompoundProtocol } from './compound/compound.protocol';
import { IProtocolPriceUpdate } from './interfaces/protocol.price.update';

@Injectable()
export class JobsRegistry {
  public readonly registry: Map<string, IProtocolPriceUpdate> = new Map<
    string,
    IProtocolPriceUpdate
  >();

  constructor(
    private readonly compoundProtocol: CompoundProtocol, //
  ) {
    this.registry.set(compoundProtocol.job, compoundProtocol);
  }
}
