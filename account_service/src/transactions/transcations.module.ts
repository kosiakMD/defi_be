import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlacklistModule } from '../blacklist/blacklist.module';
import { ChainModule } from '../chain/chain.module';
import { CovalentModule } from '../covalent/covalent.module';
import { TransactionNewEntity } from './entity/transaction.new.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionNewEntity]),
    ChainModule,
    CovalentModule,
    BlacklistModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
