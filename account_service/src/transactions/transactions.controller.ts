import { Controller, Get, Query } from '@nestjs/common';

import { TransactionsResponse } from './interfaces/transactions.interfaces';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('/')
  async get(@Query('addresses') address: string): Promise<TransactionsResponse> {
    if (!address) return [];

    return this.transactionsService.getTransactions(address.split(','));
  }
}
