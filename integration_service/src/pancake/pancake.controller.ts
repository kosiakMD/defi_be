import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';

import { Base } from '../interfaces/transactions.interfaces';
import BaseDataDto from '../uniswap/dto/BaseData.dto';
import { PancakeService } from './pancake.service';

@Controller('integration')
export class PancakeController {
  constructor(private readonly pancakeService: PancakeService) {}

  @Get('/pancake')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example: '',
  })
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  getDataByAddresses(@Query('addresses') addresses: string, @Query('internal') internal): Promise<Base[]> {
    return Number(internal) === 1 ? this.pancakeService.getDataInternal(addresses) : this.pancakeService.getDataExternal(addresses)
  }
}
