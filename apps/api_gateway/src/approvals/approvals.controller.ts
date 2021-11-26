import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApprovalDTO } from '../account/account.dto';
import { AccountService } from '../account/account.service';

@ApiTags('Approvals')
@Controller('v1/approvals')
export class ApprovalsController {
  constructor(
    private accountService: AccountService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
  @ApiResponse({ status: 200, type: ApprovalDTO })
  async getBscApproval(
    @Query('addresses') addresses: string,
    @Query('chains') chains: string,
  ): Promise<ApprovalDTO[]> {
    return this.accountService.getApprovals(addresses, chains);
  }
}
