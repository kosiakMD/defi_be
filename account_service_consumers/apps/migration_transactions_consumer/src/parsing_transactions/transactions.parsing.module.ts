import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChainModule } from '../chain/chain.module';
import { PriceModule } from '../price/price.module';
import { AssetsEntity } from './entities/assets.entity';
import { AssetsNewEntity } from './entities/assets.new.entity';
import { TransactionsEntity } from './entities/transactions.entity';
import { MigrationTransactionController } from './migration.transaction.controller';
import { TransactionsParsingService } from './transactions.parsing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetsEntity, AssetsNewEntity, TransactionsEntity]),
    HttpModule,
    PriceModule,
    ChainModule,
  ],
  providers: [TransactionsParsingService],
  controllers: [MigrationTransactionController],
})
export class TransactionsParsingModule {}
