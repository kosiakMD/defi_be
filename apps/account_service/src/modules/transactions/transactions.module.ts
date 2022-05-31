import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CovalentService } from '../../common/providers/3rdparty/covalent.service';
import { BscScanApi } from '../../common/providers/chain-related/scans/bsc-scan-api';
import { EtherScanApi } from '../../common/providers/chain-related/scans/ether-scan-api';
import { Web3Service } from '../../common/providers/chain-related/web3.service';

import { TransactionsController } from '../../controllers/transactions.controller';
import { BlacklistModule } from '../blacklists/blacklist.module';
import { ChainsModule } from '../chains/chains.module';
import { ScansApiModule } from '../scans-api.module';
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
    EtherScanApi,
    Web3Service,
    BscScanApi,
    BscscanTransactionsService,
  ],
})
export class TransactionsModule {}
