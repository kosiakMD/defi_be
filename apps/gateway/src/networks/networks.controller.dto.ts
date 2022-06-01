import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

import { NetworkResponseDto } from './dto';

@ApiTags('Safe')
@Controller('v1/networks')
export class NetworksController extends BaseService implements IBaseService {
  url = this.buildUrl(
    this.configService.get<string>('INTEGRATION_SERVICE_HOST'),
    this.configService.get<string>('INTEGRATION_SERVICE_PORT'),
  );

  @Get('')
  @ApiResponse({ status: HttpStatus.OK, type: [NetworkResponseDto] })
  getNetworks(): Promise<NetworkResponseDto[]> {
    return this.requestProxy(this.url + 'v1/networks');
  }
}
