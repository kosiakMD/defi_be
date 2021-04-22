import { Inject } from '@nestjs/common';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AccountService } from '../account/account.service';
import { Logger } from '../common/Logger/Logger.service';
import { TransfersResponseDto } from './transfers.dto';
import { TransfersResponse } from './transfers.interfaces';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
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
  @ApiQuery({
    name: 'chains',
    type: String,
    required: false,
    description: `Array of chains' IDs (comma separated)`,
    // example: '1,2',
    example: '',
  })
  @ApiResponse({ status: 200, type: TransfersResponseDto })
  get(
    @Query('addresses') addresses: string,
    @Query('chains') chains: string,
  ): Promise<TransfersResponse> {
    return this.service.getTransfers(addresses, chains);
  }
}
