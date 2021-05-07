import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { BalanceService } from './balance.service';
import { EtherscanService } from './bcs_etherscan/etherscan.service';
import { BalancesResponseDto } from './dto/balances.dto';
import { BalancesResponse } from './interfaces/balance.interfaces';

@ApiTags('Balances')
@Controller('balances')
export class BalanceController {
  constructor(
    private readonly balanceService: BalanceService,
    private readonly etherscanService: EtherscanService,
  ) {}

  @Get('')
  @ApiQuery({
    name: 'addresses',
    type: String,
    example: '0x0000000000000000000000000000000000000000',
  })
  @ApiQuery({
    name: 'chains',
    type: Number,
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'internal',
    type: Number,
    example: 1,
    required: false,
  })
  @ApiResponse({ status: 200, type: BalancesResponseDto })
  getUserBalanceByAddresses(
    @Query('addresses') addresses: string,
    @Query('chains') chains: number,
    @Query('internal') internal: number,
  ): Promise<BalancesResponse> {
    return internal
      ? this.balanceService.getAllBalanceData(addresses, Number(chains))
      : this.etherscanService.getAllBalanceData(addresses, chains);
  }
}
