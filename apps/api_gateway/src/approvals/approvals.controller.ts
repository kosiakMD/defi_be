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
    example: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getBscApproval(
    @Query('addresses') addresses: string,
    @Query('chains') chains: string,
  ): Promise<any> {
    return this.requestProxy(this.url + 'v1/approvals', 'GET', { params: { addresses, chains } });
  }
}
