import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Puppeteer } from '../../utils';
import { ChainsRepository } from '../database/repositories/chains.repo';
import { ContractsAnalysisRepository } from '../database/repositories/contracts.analysis.repo';
import { ContractsRepository } from '../database/repositories/contracts.repo';
import { GithubFilesRepository } from '../database/repositories/github.files.repo';
import { LinksRepository } from '../database/repositories/links.repo';
import { ProtocolChainRepository } from '../database/repositories/protocol.chain.repo';
import { ProtocolsPropertiesRepository } from '../database/repositories/protocols.properties.repo';
import { ProtocolsRepository } from '../database/repositories/protocols.repo';
import { ServicesModule } from '../services/services.module';
import { ProtocolService } from './protocols.service';
import { AbiFetcherBscscan } from './services/abi/fetcher/abi.fetcher.bscscan';
import { AbiFetcherEtherscan } from './services/abi/fetcher/abi.fetcher.etherscan';
import { AbiFetcherHelper } from './services/abi/fetcher/abi.fetcher.helper';
import { AbiFetcherService } from './services/abi/fetcher/abi.fetcher.service';
import { AbiFetcherTenderly } from './services/abi/fetcher/abi.fetcher.tenderly';
import { ContractsAnalysisService } from './services/contracts.analysis.service';
import { ContractsAnalysisServiceV1 } from './services/contracts.analysis.service.v1';
import { ContractsService } from './services/contracts.service';
import { GithubService } from './services/github.service';
import { CheckTypeDoc } from './services/utils/check_type_docs';
import { MainPageStrategy, AppPageStrategy } from './strategies';
import { GeneralPageParsing } from './strategies/contract';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    ServicesModule,
    TypeOrmModule.forFeature([
      ProtocolsRepository,
      ChainsRepository,
      ContractsRepository,
      LinksRepository,
      GithubFilesRepository,
      ProtocolChainRepository,
      ProtocolsPropertiesRepository,
      ContractsAnalysisRepository,
    ]),
  ],
  providers: [
    ProtocolService,
    ContractsService,
    Puppeteer,
    MainPageStrategy,
    AppPageStrategy,
    GeneralPageParsing,
    CheckTypeDoc,
    AbiFetcherTenderly,
    AbiFetcherEtherscan,
    AbiFetcherBscscan,
    AbiFetcherHelper,
    GithubService,
    AbiFetcherService,
    ContractsAnalysisService,
    ContractsAnalysisServiceV1,
  ],
  exports: [ProtocolService, ContractsAnalysisService, ContractsAnalysisServiceV1],
})
export class ProtocolModule {}
