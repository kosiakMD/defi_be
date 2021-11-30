import { Injectable } from '@nestjs/common';

import { IProtocolPriceUpdate } from './interfaces/protocol.price.update';
import { AaveProtocol } from './protocols/aave/aave.protocol';
import { CompoundProtocol } from './protocols/compound/compound.protocol';
import { IearnProtocol } from './protocols/iearn/iearn.protocol';
import { YearnProtocol } from './protocols/yearn/yearn.protocol';

@Injectable()
export class JobsRegistry {
  public readonly registry: Map<string, IProtocolPriceUpdate> = new Map<
    string,
    IProtocolPriceUpdate
  >();

  constructor(
    private readonly aaveProtocol: AaveProtocol,
    private readonly compoundProtocol: CompoundProtocol,
    private readonly yearnProtocol: YearnProtocol,
    private readonly iearnProtocol: IearnProtocol,
  ) {
    this.register(aaveProtocol);
    this.register(compoundProtocol);
    this.register(iearnProtocol);
    this.register(yearnProtocol);
  }

  private register(protocol: IProtocolPriceUpdate) {
    this.registry.set(protocol.job, protocol);
  }
}
