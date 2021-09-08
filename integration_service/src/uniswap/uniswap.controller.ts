import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

import { BaseData } from '../interfaces/transactions.interfaces';
import BaseDataDto from './dto/BaseData.dto';
import { UniswapService } from './uniswap.service';

@Controller('integration')
export class UniswapController {
  constructor(private readonly integrationService: UniswapService) {}

  @Get('/uniswap')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0x43e5ffd0c720b356b0b0e9f8c8178ad35dd4050c,0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2,0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974',
  })
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  getDataByAddresses(@Query('addresses') addresses: string): Promise<BaseData[]> {
    if (!addresses) {
      return Promise.resolve([]);
    }
    return this.integrationService.getDataByAddresses(addresses);
  }
}
