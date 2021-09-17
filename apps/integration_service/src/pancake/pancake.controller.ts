import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

import { BaseData } from '../interfaces/transactions.interfaces';
import BaseDataDto from '../uniswap/dto/BaseData.dto';
import { PriceResponseDto, PricesPayload } from './dto/price.response.dto';
import { PancakePriceService } from './pancake.price.service';
import { PancakeService } from './pancake.service';

@Controller('integration')
export class PancakeController {
  constructor(
    private readonly pancakeService: PancakeService,
    private readonly pancakePriceService: PancakePriceService,
  ) {}

  @Get('/pancake')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example: '0x05ff2b0db69458a0750badebc4f9e13add608c7f',
  })
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  getDataByAddresses(@Query('addresses') addresses: string): Promise<BaseData[]> {
    if (!addresses) {
      return Promise.resolve([]);
    }
    return this.pancakeService.getData(addresses);
  }

  @Get('/pancake/prices')
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  getIntegrationPrices(): Promise<PriceResponseDto<PricesPayload>> {
    return this.pancakePriceService.liquidityPoolsPrices();
  }
}
