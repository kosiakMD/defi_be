import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { getUniqList } from '@app/common/utils';

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
    example: [1, 2],
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

  @Get('delegations')
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of user address',
    example: [
      '5CikRvE8yfLw6zv5Uo6CWwBVXBGWhR1swiex6oxwVoPs',
      'addr1q8lk947egs266g6q495px930g7xezjg9vn80dq3k20qcekz2m94cccva4539vt6wv725jh4utctf7yeyrraqnak0wndsv0pdsw',
      'terra1qqu376azltyc5wnsje5qgwru5mtj2yqdhj0cwl',
    ],
  })
  // TODO: DTO should be declared here
  getUserDelegations(@Query() query) {
    return this.balancesService.getUserDelegations(getUniqList(query.addresses));
  }
}
