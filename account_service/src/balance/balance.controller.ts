import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum } from 'src/common/enum';

import { BalancesQueryDto, BalancesResponseDto } from './balance.dto';
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
    example: [ChainIdEnum.eth, ChainIdEnum.bsc],
    required: false,
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of address',
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
    description: 'Array of asset addresses',
    example: [
      '0xdac17f958d2ee523a2206206994597c13d831ec7',
      '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
    ],
  })
  @ApiResponse({ status: 200, type: BalancesResponseDto })
  getUserBalanceByAddresses(@Query() query: BalancesQueryDto): Promise<BalancesResponse> {
    const { addresses, chains, assets } = query;

    return this.balancesService.getBalance(addresses, chains, assets);
  }
}
