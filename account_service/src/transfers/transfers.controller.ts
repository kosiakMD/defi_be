import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

import { TransfersService } from './transfers.service';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transactionService: TransfersService) {}

  @Get('/')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0xcff17036c5ae141f2244f480fc16ba244ffab33b,0x07471d0262b17529a489d0c696eef988f89464ac',
  })
  getTransfersByAddresses(@Query('addresses') addresses: string): Promise<any> {
    if (!addresses) {
      return Promise.resolve([]);
    }
    return this.transactionService.getAllTransactionDataByAddress(addresses);
  }
}
