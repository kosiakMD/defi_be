import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ContractApprovalResponse } from '@app/common/interfaces';

import { ContractApprovalResponseDto } from '../common/dto';

import { ApprovalsService } from '../modules/approvals/approvals.service';

@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalsController {
  constructor(
    private service: ApprovalsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('')
  @ApiQuery({
    name: 'addresses',
    type: String,
    example: '0x94dfce828c3daaf6492f1b6f66f9a1825254d24b',
  })
  @ApiResponse({ status: 200, type: ContractApprovalResponseDto })
  async getBscApproval(@Query('addresses') addresses: string): Promise<ContractApprovalResponse> {
    return this.service.getAllApprovals(addresses);
  }
}
