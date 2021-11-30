import { Module } from '@nestjs/common';

import { ChainModule } from '../../chain/chain.module';
import { MicroservicesModule } from '../../microservices/microservices.module';
import { TheGraphModule } from '../../thegraph/thegraph.module';
import { AaveProtocol } from './aave/aave.protocol';
import { CompoundProtocol } from './compound/compound.protocol';
import { IearnProtocol } from './iearn/iearn.protocol';
import { YearnProtocol } from './yearn/yearn.protocol';

const protocols = [
  AaveProtocol, //
  CompoundProtocol,
  YearnProtocol,
  IearnProtocol,
];

@Module({
  imports: [MicroservicesModule, ChainModule, TheGraphModule],
  providers: protocols,
  exports: protocols,
})
export class ProtocolsModule {}
