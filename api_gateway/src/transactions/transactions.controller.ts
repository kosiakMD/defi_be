import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Logger } from 'src/common/Logger/Logger.service';

import { AccountService } from '../account/account.service';
import { TransactionQueryDto } from './transaction.query.dto';
import { TransactionsNewDetailedResponseDto } from './transactions.dto';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private service: AccountService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

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
