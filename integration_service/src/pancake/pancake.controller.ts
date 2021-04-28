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
    example: '0x05ff2b0db69458a0750badebc4f9e13add608c7f',
  })
  @ApiQuery({
    name: 'internal',
    type: Number,
    description: 'internal -> from local database, instead of subgraph call, default 1',
    example: 1
  })
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  getDataByAddresses(
    @Query('addresses') addresses: string,
    @Query('internal') internal,
  ): Promise<Base[]> {
    return Number(internal) === 1
      ? this.pancakeService.getDataInternal(addresses)
      : this.pancakeService.getDataExternal(addresses);
  }
}
