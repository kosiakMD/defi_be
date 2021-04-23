import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { EtherscanTransactionsService } from './etherscan.transactions.service';
import { BscscanTransactionsService } from './bscscan.transactions.service';
import { EtherscanApi } from './api/etherscan.api';
import { BscscanApi } from './api/bscscan.api';
import { Web3Service } from './web3.service';

@Module({
  imports: [TypeOrmModule.forFeature(), ChainModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, EtherscanTransactionsService, EtherscanApi, Web3Service, BscscanApi, BscscanTransactionsService],
})
export class TransactionsModule {}
