import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common';

import { BalancesPostQueryDto, BalancesQueryDto, BalancesResponseDto } from './balance.dto';
import { BalancesService } from './balances.service';
import { BalancesResponse } from './interfaces/balance.interfaces';

@ApiTags('Balances')
@Controller('balances')
export class BalanceController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get('')
  @ApiQuery({
    name: 'chains',
    type: Number,
    isArray: true,
    description: 'Array of chain ID',
    required: false,
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of address',
    example: [
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
    ],
  })
  @ApiQuery({
    name: 'assets',
    type: String,
    isArray: true,
    required: false,
    description: 'Array of asset addresses',
    example: [],
  })
  @ApiResponse({ status: 200, type: BalancesResponseDto })
  getUserBalanceByAddresses(@Query() query: BalancesQueryDto): Promise<BalancesResponse> {
    const { addresses, chains, assets } = query;

    return this.balancesService.getBalance(addresses, chains, assets);
  }

  @Post()
  @ApiBody({ type: BalancesPostQueryDto })
  @ApiResponse({ status: 200, type: BalancesResponseDto })
  getUserBalanceByAddressesPost(@Body() body: BalancesPostQueryDto): Promise<BalancesResponse> {
    const { addresses, chains, assets } = body;

    return this.balancesService.getBalance(addresses, chains, assets);
  }

  @Get('/24-hour-returns')
  @ApiQuery({
    name: 'chains',
    type: Number,
    isArray: true,
    description: 'Array of chain ID',
    example: [ChainIdEnum.eth, ChainIdEnum.bsc],
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of user address',
    example: [
      '0x0000000000000000000000000000000000000000',
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
    ],
  })
  @ApiQuery({
    name: 'assets',
    type: String,
    isArray: true,
    required: false,
    description: 'Array of token addresses',
    example: [
      '0x0000000000000000000000000000000000000000',
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
    ],
  })
  getUser24HourReturns(@Query() query: BalancesQueryDto): Promise<any> {
    const { addresses, chains, assets } = query;
    return this.balancesService.get24HourReturns(addresses, chains, assets);
  }
}
