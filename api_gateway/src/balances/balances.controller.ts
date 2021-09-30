import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Logger } from 'src/common/Logger/Logger.service';

import { BalancesResponse } from '../account/account.interfaces';
import { AccountService } from '../account/account.service';
import { BalancesQueryDto, BalancesResponseDto } from './balances.dto';

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
    example:
      '0x43e5ffd0c720b356b0b0e9f8c8178ad35dd4050c,0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2,0xa2107fa5b38d9bbd2c461d6edf11b11a50f6b974',
  })
  @ApiQuery({
    name: 'chains',
    type: String,
    required: false,
    description: 'Array of chain ID (comma separated)',
    example: '1,2,3,4',
  })
  @ApiQuery({
    name: 'assets',
    type: String,
    required: false,
    description: 'Array of asset addresses (comma separated)',
    example:
      '0xdac17f958d2ee523a2206206994597c13d831ec7,0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
  })
  @ApiResponse({ status: 200, type: BalancesResponseDto })
  public getBalance(@Query() query: BalancesQueryDto): Promise<BalancesResponse> {
    const { addresses, chains, assets } = query;

    return this.service.getBalances(addresses, chains, assets);
  }
}
