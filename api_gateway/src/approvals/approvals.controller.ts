import { CACHE_MANAGER, Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Cache } from 'cache-manager';

import ContractApprovalDto from '../common/DTO/ContractApproval.dto';
import EthereumAddressDto from '../common/DTO/EthereumAddress.dto';
import { ContractApproval } from '../common/interfaces';
import { ApprovalsService } from './approvals.service';

@ApiTags('Approvals')
@Controller('approvals')
export class ApprovalsController {
  constructor(
    private service: ApprovalsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get('/:address')
  @ApiParam({
    name: 'address',
    type: String,
    example: '0x0000000000000000000000000000000000000000',
  })
  @ApiResponse({ status: 200, type: ContractApprovalDto, isArray: true })
  async get(@Param() params: EthereumAddressDto): Promise<ContractApproval[]> {
    return this.service.getAll(params.address);
  }
}
