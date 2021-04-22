import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TransactionsResponseDto } from './dto/transactions.dto';
import { TransactionsResponse } from './interfaces/transactions.interfaces';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('/')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0xcff17036c5ae141f2244f480fc16ba244ffab33b,0x07471d0262b17529a489d0c696eef988f89464ac',
  })
  @ApiResponse({ status: 200, type: TransactionsResponseDto })
  async get(@Query('addresses') address: string): Promise<TransactionsResponse | []> {
    if (!address) return [];

    return this.transactionsService.getTransactions(address.split(','));
  }
}
