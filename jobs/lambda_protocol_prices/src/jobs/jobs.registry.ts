import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { IProtocolPriceUpdate } from './interfaces/protocol.price.update';
import { ActiveProtocols } from './protocols/protocols.module';

type ProtocolRegistryMap = Map<string, IProtocolPriceUpdate>;

@Injectable()
export class JobsRegistry {
  public readonly registry: ProtocolRegistryMap = new Map();

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    await Promise.all(
      ActiveProtocols.map(async (protocol) => {
        this.register(await this.moduleRef.create(protocol));
      }),
    );
  }

  private register(protocol: IProtocolPriceUpdate) {
    this.registry.set(protocol.job, protocol);
  }
}
