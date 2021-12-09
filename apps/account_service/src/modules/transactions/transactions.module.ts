import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CovalentService } from '../../common/providers/3rdparty/covalent.service';
import { BscscanApi } from '../../common/providers/chainRelated/scans/bscscan.api';
import { EtherscanApi } from '../../common/providers/chainRelated/scans/etherscan.api';
import { Web3Service } from '../../common/providers/chainRelated/web3.service';

import { TransactionsController } from '../../controllers/transactions.controller';
import { BlacklistModule } from '../blacklists/blacklist.module';
import { ChainsModule } from '../chains.module';
import { ScansApiModule } from '../scans.api.module';
import { BscscanTransactionsService } from './bscscan.transactions.service';
import { TransactionsNewEntity } from './entities/transactions.new.entity';
import { EtherscanTransactionsService } from './etherscan.transactions.service';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([TransactionsNewEntity]),
    ChainsModule,
    ScansApiModule,
    BlacklistModule,
  ],
  controllers: [TransactionsController],
  providers: [
    CovalentService,
    TransactionsService,
    EtherscanTransactionsService,
    EtherscanApi,
    Web3Service,
    BscscanApi,
    BscscanTransactionsService,
  ],
})
export class TransactionsModule {}
