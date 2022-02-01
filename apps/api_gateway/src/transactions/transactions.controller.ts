import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { BaseService } from '../common/services/base.service';

import {
  TransactionsDetailedResponseDto,
  TransactionsNewDetailedResponseDto,
} from './dto/transactions.dto';
import { TransactionsResponse } from './interfaces/transactions.interfaces';

@ApiTags('Transactions')
@Controller('v1/transactions')
export class TransactionsController extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('ACCOUNT_SERVICE_HOST'),
    this.configService.get<string>('ACCOUNT_SERVICE_PORT'),
  );

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
  @ApiResponse({ status: HttpStatus.OK, type: TransactionsDetailedResponseDto })
  public getTransactions(@Query() query): Promise<TransactionsResponse[]> {
    return this.requestProxy(this.url + 'v1/transactions', 'GET', { params: query });
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
  @ApiResponse({ status: HttpStatus.OK, type: TransactionsNewDetailedResponseDto })
  public getTransactionsNew(@Query() query): Promise<TransactionsNewDetailedResponseDto> {
    return this.requestProxy(this.url + 'v1/transactions/new', 'GET', { params: query });
  }
}
