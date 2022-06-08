import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HttpModule } from '@app/common';

import { Puppeteer } from '../../utils';
import { DatabaseModule } from '../database/database.module';
import { ChainsRepository } from '../database/repositories/chains.repo';
import { ContractsRepository } from '../database/repositories/contracts.repo';
import { ProtocolChainRepository } from '../database/repositories/protocol.chain.repo';
import { ProtocolsPropertiesRepository } from '../database/repositories/protocols.properties.repo';
import { ProtocolsRepository } from '../database/repositories/protocols.repo';
import { ServicesModule } from '../services/services.module';
import { AggregatorsService } from './aggregator.service';
import { DappradarAggregator } from './impls/dappradar.aggregator';
import { DefilamaAggregator } from './impls/defilama.aggregator';
import { MultifarmFiAggregator } from './impls/multifarm.fi.aggregator';
import { VfatToolsAggregator } from './impls/vfat.tools.aggregator';

@Module({
  imports: [
    HttpModule,
    DatabaseModule,
    ConfigModule,
    ServicesModule,
    TypeOrmModule.forFeature([
      ChainsRepository,
      ProtocolChainRepository,
      ProtocolsPropertiesRepository,
      ProtocolsRepository,
      ContractsRepository,
    ]),
  ],
  providers: [
    AggregatorsService,
    DappradarAggregator,
    DefilamaAggregator,
    VfatToolsAggregator,
    MultifarmFiAggregator,
    Puppeteer,
  ],
  exports: [AggregatorsService],
})
export class AggregatorModule {}
