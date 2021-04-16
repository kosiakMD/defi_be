import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BalancesResponse } from 'src/account/account.interfaces';

import { Logger } from '../common/Logger/Logger.service';
import { IntegrationService } from '../integration/integration.service';

@ApiTags('Platform')
@Controller('balancer')
export class BalancerController {
  constructor(
    private integrationService: IntegrationService,
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
    description: `Array of chains' IDs (comma separated)`,
    // example: '1,2',
    example: '',
  })
  @ApiResponse({ status: 200, type: Object })
  async get(
    @Query('addresses') addresses: string,
    @Query('chains') chains: string,
  ): Promise<BalancesResponse> {
    return this.integrationService.getBalancer(addresses, chains);
  }
}
