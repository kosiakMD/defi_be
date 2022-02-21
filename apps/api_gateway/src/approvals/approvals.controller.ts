import { GetAllApprovalsDto } from 'apps/account_service/src/common/dto/GetAllApprovals.dto';
import { ApprovalsSortFieldsEnum } from 'apps/account_service/src/common/enum/ApprovalsSortFields.enum';

import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

@ApiTags('Approvals')
@Controller('v1/approvals')
export class ApprovalsController extends BaseService implements IBaseService {
  url = this.buildUrl(
    this.configService.get<string>('ACCOUNT_SERVICE_HOST'),
    this.configService.get<string>('ACCOUNT_SERVICE_PORT'),
  );

  @Get('/')
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
  @ApiResponse({ status: HttpStatus.OK })
  async getBscApproval(@Query() getAllApprovalsQuery: GetAllApprovalsDto): Promise<any> {
    return this.requestProxy(this.url + 'v1/approvals', 'GET', { params: getAllApprovalsQuery });
  }
}
