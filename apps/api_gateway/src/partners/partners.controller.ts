import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

import { PartnerResponseDto } from './dto/partner.response.dto';

@ApiTags('Safe')
@Controller('v1/partners')
export class PartnersController extends BaseService implements IBaseService {
  url = this.buildUrl(
    this.configService.get<string>('SAFE_PROXY_SERVICE_HOST'),
    this.configService.get<string>('SAFE_PROXY_SERVICE_PORT'),
  );

  @Get('')
  @ApiResponse({ status: HttpStatus.OK, type: [PartnerResponseDto] })
  getPartners(): Promise<PartnerResponseDto[]> {
    return this.requestProxy(this.url + 'v1/partners');
  }
}
