import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SafeProxyService } from 'src/safe-proxy/safe.proxy.service';

import { Controller, Get, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { Logger } from 'src/common/Logger/Logger.service';

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
