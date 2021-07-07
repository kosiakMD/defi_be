import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { ScanApiModule } from '../scan_api/scan.api.module';
import { BscscanApi } from './api/bscscan.api';
import { EtherscanApi } from './api/etherscan.api';
import { BscscanTransactionsService } from './bscscan.transactions.service';
import { TransactionsEntity } from './entity/transactions.entity';
import { EtherscanTransactionsService } from './etherscan.transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { Web3Service } from './web3.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionsEntity]), ChainModule, ScanApiModule],
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
