import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common';

import { BalancesResponse } from '../modules/balances/balances.interfaces';
import { BalancesService } from '../modules/balances/balances.service';
import {
  BalancesPostQueryDto,
  BalancesQueryDto,
  BalancesResponseDto,
  ReturnsResponse,
} from '../modules/balances/dto/balance.dto';

@ApiTags('Balances')
@Controller('balances')
export class BalancesController {
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
    example: [ChainIdEnum.eth, ChainIdEnum.bnb],
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of user address',
    example: [
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
      '0x60dE7F647dF2448eF17b9E0123411724De6e373D',
    ],
  })
  getUser24HourReturns(@Query() query: BalancesQueryDto): Promise<ReturnsResponse> {
    const { addresses, chains, assets } = query;
    return this.balancesService.get24HourReturns(addresses, chains, assets);
  }
}
