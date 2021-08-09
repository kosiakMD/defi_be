import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { IntegrationService } from '../integration/integration.service';
import BaseDataDto from 'src/common/DTO/BaseData.dto';
import { Logger } from 'src/common/Logger/Logger.service';

@ApiTags('Platform')
@Controller('sushiswap')
export class SushiswapController {
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
  @ApiResponse({ status: 200, type: BaseDataDto, isArray: true })
  async get(@Query('addresses') addresses: string): Promise<any> {
    this.logger.time('getSushiswap');
    const result = this.integrationService.getSushiswap(addresses);
    this.logger.timeEnd('getSushiswap');
    return result;
  }
}
