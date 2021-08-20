import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlacklistModule } from '../blacklist/blacklist.module';
import { ChainModule } from '../chain/chain.module';
import { CovalentModule } from '../covalent/covalent.module';
import { ScanApiModule } from '../scan_api/scan.api.module';
import { BscscanApi } from './api/bscscan.api';
import { EtherscanApi } from './api/etherscan.api';
import { BscscanTransactionsService } from './bscscan.transactions.service';
import { TransactionNewEntity } from './entity/transaction.new.entity';
import { EtherscanTransactionsService } from './etherscan.transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Web3Service } from './web3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionNewEntity]),
    ChainModule,
    ScanApiModule,
    CovalentModule,
    BlacklistModule,
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    EtherscanTransactionsService,
    EtherscanApi,
    Web3Service,
    BscscanApi,
    BscscanTransactionsService,
  ],
})
export class TransactionsModule {}
