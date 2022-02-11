import { Module } from '@nestjs/common';

import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MicroservicesModule } from '../../microservices/microservices.module';
import { AbiProvider } from './abi.provider';
import { FrameworkService } from './framework.service';
import { Handler } from './services/handler';
import { PoolsFeatureProcessor } from './services/pools.feature.processor';
import { PoolsInstructionsCollector } from './services/pools.instructions.collector';
import { ProtocolsIterator } from './services/protocols.iterator';

@Module({
  imports: [MicroservicesModule],
  providers: [
    MulticallAggregator,
    Web3ProviderService,
    Handler,
    ProtocolsIterator,
    PoolsInstructionsCollector,
    PoolsFeatureProcessor,
    AbiProvider,
    FrameworkService,
  ],
  exports: [FrameworkService],
})
export class FrameworkModule {}
