import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TransactionsResponseDto } from './dto/transactions.dto';
import { ApiTransactionsResponseDto } from './dto/api.transactions.dto';
import { TransactionsResponse } from './interfaces/transactions.interfaces';
import { TransactionsResponse as ApiTransactionsResponse, Transaction } from './interfaces/api.transactions.interfaces';
import { TransactionsService } from './transactions.service';
import { EtherscanTransactionsService } from './etherscan.transactions.service';
import { BscscanTransactionsService } from './bscscan.transactions.service';

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
  @ApiResponse({ status: 200, type: ApiTransactionsResponseDto })
  async getEtherscanTransactions(@Query('address') addresses: string): Promise<ApiTransactionsResponse | []> {
    if(!addresses) return [];
    
    const addressesSplited: string[] = addresses.split(',');

    const transactions: any[] = await Promise.all([
      this.bscscanTransactionsService.getTransactions(addressesSplited),
      this.bscscanTransactionsService.getInternalTransactions(addressesSplited),
      this.etherscanTransactionsService.getTransactions(addressesSplited),
      this.etherscanTransactionsService.getInternalTransactions(addressesSplited),
    ]);

    return addressesSplited.reduce((acc, address) => {
      const transactionsFromAll: Transaction[] = transactions.reduce((acc, transaction) => [...acc, ...transaction[address]], []);

      return {
        ...acc,
        [address]: transactionsFromAll
      };
    }, {});
  }
}
