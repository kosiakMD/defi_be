import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Puppeteer } from '../../utils';
import { ChainsRepository } from '../database/repositories/chains.repo';
import { ContractsRepository } from '../database/repositories/contracts.repo';
import { GithubFilesRepository } from '../database/repositories/github.files.repo';
import { LinksRepository } from '../database/repositories/links.repo';
import { ProtocolChainRepository } from '../database/repositories/protocol.chain.repo';
import { ProtocolsPropertiesRepository } from '../database/repositories/protocols.properties.repo';
import { ProtocolsRepository } from '../database/repositories/protocols.repo';
import { ProtocolService } from './protocols.service';
import { AbiFetcherBscscan } from './services/abi.fetcher.bscscan';
import { AbiFetcherDummy } from './services/abi.fetcher.dummy';
import { AbiFetcherEtherscan } from './services/abi.fetcher.etherscan';
import { ContractsService } from './services/contracts.service';
import { GithubService } from './services/github.service';
import { CheckTypeDoc } from './services/utils/check_type_docs';
import { MainPageStrategy, AppPageStrategy } from './strategies';
import { GeneralPageParsing } from './strategies/contract';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([
      ProtocolsRepository,
      ChainsRepository,
      ContractsRepository,
      LinksRepository,
      GithubFilesRepository,
      ProtocolChainRepository,
      ProtocolsPropertiesRepository,
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
    AbiFetcherDummy,
    AbiFetcherEtherscan,
    AbiFetcherBscscan,
    GithubService,
  ],
  exports: [ProtocolService],
})
export class ProtocolModule {}
