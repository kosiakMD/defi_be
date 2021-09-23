import { classToPlain } from 'class-transformer';

import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TransactionQueryDto } from './dto/transaction.query.dto';
import { TransactionsNewDetailedResponseDto } from './dto/transactions.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('/new')
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of Addresses',
    example: [
      '0xcff17036c5ae141f2244f480fc16ba244ffab33b',
      '0x07471d0262b17529a489d0c696eef988f89464ac',
    ],
  })
  @ApiQuery({
    name: 'chains',
    type: Number,
    isArray: true,
    required: false,
    description: `Array of chains' ID`,
    example: [1, 2],
  })
  @ApiResponse({ status: 200, type: TransactionsNewDetailedResponseDto })
  // TODO rename after finished
  public async getInternalV2(@Query() query: TransactionQueryDto): Promise<any> {
    const { addresses, chains } = query;
    return classToPlain(this.transactionsService.getTransactionsNew(addresses, chains));
  }
}
