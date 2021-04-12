import { Controller, Get, ParseArrayPipe, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { EtherscanEnum } from '../constants';

@ApiTags('Transactions')
@Controller('transfers')
export class TransfersController {
  @Get('/')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'comma-separated Array String',
  })
  @ApiQuery({
    name: 'etherscan',
    enum: EtherscanEnum,
    required: false,
    description: `either true or false; default is 'false'`,
  })
  @ApiResponse({ status: 200, type: String })
  get(
    @Query('addresses', new ParseArrayPipe({ items: String, separator: ',' }))
    addresses: string[],
    @Query('etherscan') etherscan: EtherscanEnum,
  ): string[] {
    const lowerCaseAddresses = addresses.map((address) => address.toLowerCase());
    return etherscan ? lowerCaseAddresses : lowerCaseAddresses;
  }
}
