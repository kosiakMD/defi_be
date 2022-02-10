import { Module } from '@nestjs/common';

import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { MicroservicesModule } from '../../microservices/microservices.module';
import { AbiProvider } from './abi.provider';
import { FrameworkService } from './framework.service';
import { Handler } from './handler';
import { PoolsCollector } from './pools.collector';
import { PoolsFeatureProcessor } from './processors/pools.feature.processor';
import { ProtocolsIterator } from './protocols.iterator';

@Module({
  imports: [MicroservicesModule],
  providers: [
    MulticallAggregator,
    Web3ProviderService,
    Handler,
    ProtocolsIterator,
    PoolsCollector,
    PoolsFeatureProcessor,
    AbiProvider,
    FrameworkService,
  ],
  exports: [FrameworkService],
})
export class FrameworkModule {}
