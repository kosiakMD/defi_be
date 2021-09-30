import { CacheModule, HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApprovalsController } from '../approvals/approvals.controller';
import { BalancesController } from '../balances/balances.controller';
import { TransactionsController } from '../transactions/transactions.controller';
import { AccountService } from './account.service';

@Module({
  imports: [HttpModule, CacheModule.register(), ConfigModule],
  providers: [AccountService],
  controllers: [ApprovalsController, BalancesController, TransactionsController],
})
export class AccountModule {}
