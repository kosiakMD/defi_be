import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

import { BalanceService } from './balance.service';
import { BalancesResponse } from './interfaces/balance.interfaces';

@Controller('balances')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('')
  @ApiQuery({
    name: 'addresses',
    type: String,
    example: '0x0000000000000000000000000000000000000000',
  })
  getUserBalanceByAddresses(@Query('addresses') addresses: string): Promise<BalancesResponse> {
    return this.balanceService.getAllBalanceData(addresses);
  }
}
