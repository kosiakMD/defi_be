import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MicroservicesModule } from '../../microservices/microservices.module';
import { AbiProvider } from './abi/abi.provider';
import { FrameworkService } from './framework.service';
import { FarmingFeatureProcessor } from './services/farming.feature.processor';
import { Handler } from './services/handler';
import { HandlerSubgraph } from './services/handler.subgraph';
import { InstructionsCollector } from './services/instructions.collector';
import { PoolsFeatureProcessor } from './services/pools.feature.processor';
import { ProtocolsIterator } from './services/protocols.iterator';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    MicroservicesModule,
  ],
  providers: [
    MulticallAggregator,
    Web3ProviderService,
    Handler,
    HandlerSubgraph,
    ProtocolsIterator,
    InstructionsCollector,
    PoolsFeatureProcessor,
    FarmingFeatureProcessor,
    AbiProvider,
    FrameworkService,
  ],
  exports: [FrameworkService],
})
export class FrameworkModule {}
