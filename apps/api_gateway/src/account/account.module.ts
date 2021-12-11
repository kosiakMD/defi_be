import { HttpModule } from '@nestjs/axios';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApprovalsController } from '../approvals/approvals.controller';
import { BalancesController } from '../balances/balances.controller';
import { BlacklistController } from '../blacklist/blacklist.controller';
import { BlacklistService } from '../blacklist/blacklist.service';
import { TransactionsController } from '../transactions/transactions.controller';
import { AccountService } from './account.service';

@Module({
  imports: [HttpModule, CacheModule.register(), ConfigModule],
  providers: [AccountService, BlacklistService],
  controllers: [
    ApprovalsController,
    BalancesController,
    TransactionsController,
    BlacklistController,
  ],
})
export class AccountModule {}
