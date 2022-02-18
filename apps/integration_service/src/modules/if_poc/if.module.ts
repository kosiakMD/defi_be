import { Module } from '@nestjs/common';

import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AbiFetcher } from './abi.fetcher';
import { ChainDataFetcher } from './chain.data.fetcher';
import { DataHolder } from './data.holder';
import { FeatureFactory } from './feature.factory';
import { ProtocolsClassifier } from './protocols.classifier';
import { ProtocolsRegistry } from './protocols.registry';

@Module({
  imports: [],
  providers: [
    MulticallAggregator,
    Web3ProviderService,
    ProtocolsRegistry,
    AbiFetcher,
    ProtocolsClassifier,
    FeatureFactory,
    ChainDataFetcher,
    DataHolder,
  ],
  exports: [ProtocolsRegistry],
})
export class IfModule {}
