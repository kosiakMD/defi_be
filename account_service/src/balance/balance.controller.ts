import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { BalanceService } from './balance.service';
import { BalancesResponseDto } from './dto/balances.dto';
import { BalancesResponse } from './interfaces/balance.interfaces';

@ApiTags('Balances')
@Controller('balances')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get('')
  @ApiQuery({
    name: 'addresses',
    type: String,
    example: '0x0000000000000000000000000000000000000000',
  })
  @ApiResponse({ status: 200, type: BalancesResponseDto })
  getUserBalanceByAddresses(@Query('addresses') addresses: string): Promise<BalancesResponse> {
    return this.balanceService.getAllBalanceData(addresses);
  }
}
