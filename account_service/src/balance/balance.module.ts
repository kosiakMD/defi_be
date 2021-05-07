import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { MulticallModule } from '../multicall/multicall.module';
import { PriceModule } from '../price/price.module';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';
import { EtherscanApi } from './bcs_etherscan/etherscan.api';
import { EtherscanService } from './bcs_etherscan/etherscan.service';
import { DbService } from './repository/db.service';

@Module({
  imports: [TypeOrmModule.forFeature(), HttpModule, ChainModule, PriceModule, MulticallModule],
  controllers: [BalanceController],
  providers: [BalanceService, DbService, EtherscanService, EtherscanApi],
})
export class BalanceModule {}
