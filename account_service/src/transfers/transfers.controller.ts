import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { TransfersService } from './transfers.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransfersController {
  constructor(private readonly transactionService: TransfersService) {}

  @Get('/')
  getTransactionsByAddresses(@Query('addresses') addresses: string): Promise<any> {
    if (!addresses) {
      return Promise.resolve([]);
    }
    return this.transactionService.getAllTransactionDataByAddress(addresses);
  }
}
