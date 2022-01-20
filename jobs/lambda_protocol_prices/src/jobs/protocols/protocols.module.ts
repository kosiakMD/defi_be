import { ClassConstructor } from 'class-transformer';

import { Module } from '@nestjs/common';

import { ChainModule } from '../../chain/chain.module';
import { MicroservicesModule } from '../../microservices/microservices.module';
import { TheGraphModule } from '../../thegraph/thegraph.module';
import { AaveProtocol } from './aave/aave.protocol';
import { CompoundProtocol } from './compound/compound.protocol';
import { IearnProtocol } from './iearn/iearn.protocol';
import { JoeProtocol } from './joe/joe.protocol';
import { ProtocolBase } from './protocol.base';
import { SynthetixProtocol } from './synthetix/synthetix.protocol';
import { YearnProtocol } from './yearn/yearn.protocol';

export const ActiveProtocols: ClassConstructor<ProtocolBase>[] = [
  AaveProtocol,
  CompoundProtocol,
  IearnProtocol,
  JoeProtocol,
  SynthetixProtocol,
  YearnProtocol,
];

@Module({
  imports: [MicroservicesModule, ChainModule, TheGraphModule],
  providers: ActiveProtocols,
  exports: ActiveProtocols,
})
export class ProtocolsModule {}
