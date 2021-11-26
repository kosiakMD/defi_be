import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { AccountService } from '../account/account.service';
import { TransactionQueryDto } from './transaction.query.dto';
import {
  TransactionsDetailedResponseDto,
  TransactionsNewDetailedResponseDto,
} from './transactions.dto';
import { TransactionsResponse } from './transactions.interfaces';

@ApiTags('Transactions')
@Controller('v1/transactions')
export class TransactionsController {
  constructor(
    private service: AccountService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get('/')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0xcff17036c5ae141f2244f480fc16ba244ffab33b,0x07471d0262b17529a489d0c696eef988f89464ac',
  })
  @ApiQuery({
    name: 'chains',
    type: String,
    required: false,
    description: `Array of chains' IDs (comma separated)`,
    example: '1,2',
  })
  @ApiResponse({ status: 200, type: TransactionsDetailedResponseDto })
  public getTransactions(@Query() query: TransactionQueryDto): Promise<TransactionsResponse[]> {
    const { addresses, chains } = query;
    return this.service.getTransactions(addresses, chains);
  }

  @Get('/new')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0xcff17036c5ae141f2244f480fc16ba244ffab33b,0x07471d0262b17529a489d0c696eef988f89464ac',
  })
  @ApiQuery({
    name: 'chains',
    type: String,
    required: false,
    description: `Array of chains' IDs (comma separated)`,
    example: '1,2',
  })
  @ApiResponse({ status: 200, type: TransactionsNewDetailedResponseDto })
  public getTransactionsNew(
    @Query() query: TransactionQueryDto,
  ): Promise<TransactionsNewDetailedResponseDto> {
    const { addresses, chains } = query;
    return this.service.getTransactionsNew(addresses, chains);
  }
}
