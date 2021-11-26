import { Controller, Get, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { SafeProxyService } from '../safe-proxy/safe.proxy.service';
import { NetworkResponseDto } from './dto';

@ApiTags('Safe')
@Controller('v1/networks')
export class NetworksController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private safeProxyService: SafeProxyService,
  ) {}

  @Get('')
  @ApiResponse({ status: 200, type: [NetworkResponseDto] })
  getNetworks(): Promise<NetworkResponseDto[]> {
    try {
      return this.safeProxyService.getNetworks();
    } catch (e) {
      this.logger.error(e, 'SafeProxyService.getNetworks');
      throw e;
    }
  }
}
