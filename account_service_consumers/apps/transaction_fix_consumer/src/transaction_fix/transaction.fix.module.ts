import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { PriceModule } from '../price/price.module';
import { AssetsNewEntity } from './entities/assets.new.entity';
import { EthBlockEntity } from './entities/eth.block.entity';
import { EthEventsEntity } from './entities/eth.events.entity';
import { EthTransactionsEntity } from './entities/eth.transactions.entity';
import { TransactionNewEntity } from './entities/transaction.new.entity';
import { ParsingService } from './parsing.service';
import { TransactionFixController } from './transaction.fix.controller';
import { TransactionFixService } from './transaction.fix.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionNewEntity,
      EthTransactionsEntity,
      EthEventsEntity,
      AssetsNewEntity,
      EthBlockEntity,
    ]),
    PriceModule,
    ChainModule,
  ],
  providers: [TransactionFixService, ParsingService],
  controllers: [TransactionFixController],
})
export class TransactionFixModule {}
