import { Controller, Get, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { SafeProxyService } from '../safe-proxy/safe.proxy.service';
import { PartnerResponseDto } from './dto';

@ApiTags('Safe')
@Controller('partners')
export class PartnersController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private safeProxyService: SafeProxyService,
  ) {}

  @Get('')
  @ApiResponse({ status: 200, type: [PartnerResponseDto] })
  getPartners(): Promise<PartnerResponseDto[]> {
    try {
      return this.safeProxyService.getPartners();
    } catch (e) {
      this.logger.error(e, 'SafeProxyService.getPartners');
      throw e;
    }
  }
}
