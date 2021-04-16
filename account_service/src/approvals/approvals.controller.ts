import { CACHE_MANAGER, Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';

import { ContractApprovalResponse } from '../interfaces';
import { ApprovalsService } from './approvals.service';

@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalsController {
  constructor(
    private service: ApprovalsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('/')
  @ApiParam({
    name: 'addresses',
    type: String,
    example: '0x0000000000000000000000000000000000000000',
  })
  @ApiResponse({ status: 200, type: ContractApprovalResponse, isArray: true })
  async getBscApproval(@Query('addresses') addresses: string): Promise<ContractApprovalResponse> {
    return this.service.getAllApprovals(addresses);
  }
}
