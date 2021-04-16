import { Get, Query } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

import { Base } from '../interfaces/transactions.interfaces';
import BaseDataDto from '../uniswap/dto/BaseData.dto';
import { SushiswapService } from './sushiswap.service';

@Controller('integration')
export class SushiswapController {
  constructor(private readonly sushiswapService: SushiswapService) {}

  @Get('/sushiswap')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example: '',
  })
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  getDataByAddresses(@Query('addresses') addresses: string): Promise<Base[]> {
    if (!addresses) {
      return Promise.resolve([]);
    }
    return this.sushiswapService.getSushiswapDataByAddresses(addresses);
  }
}
