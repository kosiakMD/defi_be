import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AllBalancesResponse } from '../account/account.interfaces';
import { AccountService } from '../account/account.service';
import { Logger } from '../common/Logger/Logger.service';

@ApiTags('Balances')
@Controller('balances')
export class BalancesController {
  constructor(
    private service: AccountService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get('/')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example: '0x0000000000000000000000000000000000000000',
  })
  @ApiResponse({ status: 200, type: Object })
  public getBalance(@Query('addresses') addresses: string): Promise<AllBalancesResponse> {
    return this.service.getBalance(addresses);
  }
}
