import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SafeProxyService } from 'src/safe-proxy/safe.proxy.service';

import { Controller, Get, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { Logger } from 'src/common/Logger/Logger.service';

import { NetworkResponseDto } from './dto';

@ApiTags('Safe')
@Controller('networks')
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
