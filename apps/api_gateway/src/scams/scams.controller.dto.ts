import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { SafeFilterOptionsQueryDto } from '@app/common/dto/SafeFilterOptionsQuery.dto';

import { SafeProxyService } from '../safe-proxy/safe.proxy.service';
import { ScamsResponseDto } from './dto';
import { ScamFunctionResponseDto } from './dto/scam.function.response.dto';
import { ScamTypeResponseDto } from './dto/scam.type.response.dto';

@ApiTags('Safe')
@Controller('v1/scams')
export class ScamsController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private safeProxyService: SafeProxyService,
  ) {}

  @Get('')
  @ApiResponse({ status: 200, type: ScamsResponseDto })
  getScams(@Query() query: SafeFilterOptionsQueryDto): Promise<ScamsResponseDto> {
    try {
      return this.safeProxyService.getScams(query);
    } catch (e) {
      this.logger.error(e, 'SafeProxyService.getScams');
      throw e;
    }
  }

  @Get('types')
  @ApiResponse({ status: 200, type: [ScamTypeResponseDto] })
  getScamTypes(): Promise<ScamTypeResponseDto[]> {
    try {
      return this.safeProxyService.getScamTypes();
    } catch (e) {
      this.logger.error(e, 'SafeProxyService.getScamTypes');
      throw e;
    }
  }

  @Get('functions')
  @ApiResponse({ status: 200, type: [ScamFunctionResponseDto] })
  getScamFunctions(): Promise<ScamFunctionResponseDto[]> {
    try {
      return this.safeProxyService.getScamFunctions();
    } catch (e) {
      this.logger.error(e, 'SafeProxyService.getScamFunctions');
      throw e;
    }
  }
}
