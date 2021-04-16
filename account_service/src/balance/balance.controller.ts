import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BalanceService } from './balance.service';
import { AllBalancesResponse } from './interfaces/balance.interfaces';

@ApiTags('Balances')
@Controller('balances')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('/')
  getUserBalanceByAddresses(@Query('addresses') addresses: string): Promise<AllBalancesResponse> {
    if (!addresses) {
      return Promise.resolve({ bscBalance: {}, balance: {} });
    }
    return this.balanceService.getAllBalanceData(addresses);
  }
}
