import { Controller, Get, Query } from '@nestjs/common';

import { BalanceService } from './balance.service';
import { AllBalancesResponse } from './interfaces/balance.interfaces';

@Controller('account-service')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('/balance')
  getUserBalanceByAddresses(@Query('addresses') addresses: string): Promise<AllBalancesResponse> {
    if (!addresses) {
      return Promise.resolve({ bscBalance: {}, balance: {} });
    }
    return this.balanceService.getAllBalanceData(addresses);
  }
}
