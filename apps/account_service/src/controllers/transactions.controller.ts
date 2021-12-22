import { classToPlain } from 'class-transformer';

import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TransactionType } from '@app/common/enum';

import {
  Transaction,
  TransactionsResponse as ApiTransactionsResponse,
} from '../common/interfaces/transactions.common.interfaces';

import { BscscanTransactionsService } from '../modules/transactions/bscscan.transactions.service';
import { ApiTransactionsAllResponseDto } from '../modules/transactions/dto/api.transactions.all.dto';
import { TransactionCovalentResponseDto } from '../modules/transactions/dto/transaction.covalent.response.dto';
import {
  TransactionsDetailedResponseDto,
  TransactionsNewDetailedResponseDto,
  TransactionsResponseDto,
} from '../modules/transactions/dto/transactions.dto';
import { TransactionsQueryDto } from '../modules/transactions/dto/transactions.query.dto';
import { EtherscanTransactionsService } from '../modules/transactions/etherscan.transactions.service';
import { TransactionsResponse } from '../modules/transactions/transactions.interfaces';
import { TransactionsService } from '../modules/transactions/transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private etherscanTransactionsService: EtherscanTransactionsService,
    private bscscanTransactionsService: BscscanTransactionsService,
  ) {}

  @Get('/')
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
  @ApiResponse({ status: 200, type: TransactionsDetailedResponseDto })
  public async getTransactions(@Query() query: TransactionsQueryDto): Promise<any> {
    const { addresses, chains } = query;
    // TODO: delete this check as we have @validation
    if (!query.addresses && query.addresses.length) return [];
    return this.transactionsService.getTransactionsFromScan(addresses, chains);
  }

  @Get('/covalent')
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
  @ApiResponse({ status: 200, type: TransactionCovalentResponseDto })
  public async getTransactionsFromCovalent(@Query() query: TransactionsQueryDto): Promise<any> {
    const { addresses, chains } = query;
    return this.transactionsService.getTransactionsFromCovalent(addresses, chains);
  }

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
  public async getInternalV2(@Query() query: TransactionsQueryDto): Promise<any> {
    const { addresses, chains } = query;
    return this.transactionsService.getTransactionsNew(addresses, chains);
  }

  @Get('/internal_v1')
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

  @Get('/all')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0x7Aa3e6a7933971423a2B7141B9a8cA5e5B2E8686,0xE76aA6064f08E3BE86ad7d28971bEfb45d356d17,0x1c29731b09d39864a0d7e68df114e97a764eb290',
  })
  @ApiResponse({ status: 200, type: ApiTransactionsAllResponseDto })
  async getEtherscanTransactions(
    @Query('addresses') addresses: string,
  ): Promise<ApiTransactionsResponse | []> {
    if (!addresses) return [];

    const addressesSplitted: string[] = addresses.split(',');

    const transactions: any[] = await Promise.all([
      this.bscscanTransactionsService.getTransactions(addressesSplitted, TransactionType.normal),
      this.bscscanTransactionsService.getTransactions(addressesSplitted, TransactionType.internal),
      this.etherscanTransactionsService.getTransactions(addressesSplitted, TransactionType.normal),
      this.etherscanTransactionsService.getTransactions(
        addressesSplitted,
        TransactionType.internal,
      ),
    ]);

    return addressesSplitted.reduce((acc, address) => {
      const transactionsFromAll: Transaction[] = transactions.reduce(
        (acc, transaction) => [...acc, ...transaction[address]],
        [],
      );

      return {
        ...acc,
        [address]: transactionsFromAll,
      };
    }, {});
  }
}
