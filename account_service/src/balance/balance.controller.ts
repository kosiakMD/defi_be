import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { BalancesQueryDto, BalancesResponseDto } from './balance.dto';
import { BalanceService } from './balance.service';
import { BalancesResponse } from './interfaces/balance.interfaces';
import { ScanService } from './scan/scan.service';

@ApiTags('Balances')
@Controller('balances')
export class BalanceController {
  constructor(
    private readonly balanceService: BalanceService,
    private readonly scanService: ScanService,
  ) {}

  @Get('')
  @ApiQuery({
    name: 'internal',
    type: Number,
    description: 'either internal data or not',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'chains',
    type: Number,
    isArray: true,
    description: 'Array of chain ID',
    example: [1, 2],
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
  @ApiResponse({ status: 200, type: BalancesResponseDto })
  getUserBalanceByAddresses(@Query() query: BalancesQueryDto): Promise<BalancesResponse> {
    const { addresses, chains } = query;

    return this.balanceService.getBalanceDataFromDb(addresses, chains);
  }

  @Get('/covalent')
  @ApiQuery({
    name: 'chains',
    type: Number,
    isArray: true,
    description: 'Array of chain ID',
    example: [1, 2],
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
  @ApiResponse({ status: 200, type: [BalancesResponseDto] })
  getBalanceFromCovalent(@Query() query: BalancesQueryDto): Promise<BalancesResponse> {
    const { addresses, chains } = query;

    return this.balanceService.getBalanceFromCovalent(addresses, chains);
  }
}
