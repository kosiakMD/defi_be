import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ContractApprovalResponse } from '@app/common/interfaces';

import { ContractApprovalResponseDto } from '../common/dto';
import { GetAllApprovalsDto } from '../common/dto/GetAllApprovals.dto';
import { ApprovalsSortFieldsEnum } from '../common/enum/ApprovalsSortFields.enum';

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
    name: 'page',
    type: Number,
    required: false,
    description: `page of approvals`,
    example: 3,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: `number per one page`,
    example: 300,
  })
  @ApiQuery({
    name: 'sortField',
    type: String,
    required: false,
    description: `field to sort by`,
    example: ApprovalsSortFieldsEnum.CONTRACT_ADDRESS,
  })
  @ApiQuery({
    name: 'sortDirection',
    type: String,
    required: false,
    description: `sort direction DESC|ASC`,
    example: 'ASC',
  })
  @ApiQuery({
    name: 'address',
    type: String,
    description: 'user addresses',
    example: '0x0000000000000000000000000000000000000000',
  })
  @ApiQuery({
    name: 'chain',
    type: String,
    required: false,
    description: `chains' ID`,
    example: '1',
  })
  @ApiResponse({ status: 200, type: ContractApprovalResponseDto })
  async getBscApproval(
    @Query() getAllApprovalsQuery: GetAllApprovalsDto,
  ): Promise<ContractApprovalResponse> {
    return this.service.getAllApprovals(getAllApprovalsQuery);
  }
}
