import { Get, Query } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

import { BaseData } from '../interfaces/transactions.interfaces';
import BaseDataDto from '../uniswap/dto/BaseData.dto';
import { SpookyswapService } from './spookyswap.service';

@Controller('integration')
export class SpookyswapController {
  constructor(private readonly spookyswapService: SpookyswapService) {}

  @Get('/spookyswap')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example: '',
  })
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  getDataByAddresses(@Query('addresses') addresses: string): Promise<BaseData[]> {
    if (!addresses) {
      return Promise.resolve([]);
    }

    return this.spookyswapService.getDataByAddresses(addresses);
  }
}
