import { Controller, Get, Query } from '@nestjs/common';

import { TransfersService } from './transfers.service';

@Controller('account-service')
export class TransfersController {
  constructor(private readonly transactionService: TransfersService) {}

  @Get('/transactions')
  getTransactionsByAddresses(@Query('addresses') addresses: string) {
    if (!addresses) {
      return Promise.resolve([]);
    }
    return this.transactionService.getAllTransactionDataByAddress(addresses);
  }
}
