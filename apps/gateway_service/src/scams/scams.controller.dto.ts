import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { SafeFilterOptionsQueryDto } from '@app/common/dto/safe-filter-options-query.dto';

import { BaseService } from '../common/services/base.service';

import { ScamsResponseDto } from './dto';
import { ScamFunctionResponseDto } from './dto/scam.function.response.dto';
import { ScamTypeResponseDto } from './dto/scam.type.response.dto';

@ApiTags('Safe')
@Controller('v1/scams')
export class ScamsController extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('SAFE_PROXY_SERVICE_HOST'),
    this.configService.get<string>('SAFE_PROXY_SERVICE_PORT'),
  );

  @Get('')
  @ApiResponse({ status: HttpStatus.OK, type: ScamsResponseDto })
  getScams(@Query() query: SafeFilterOptionsQueryDto): Promise<ScamsResponseDto> {
    return this.requestProxy(this.url + 'v1/scams', 'GET', { params: query });
  }

  @Get('types')
  @ApiResponse({ status: HttpStatus.OK, type: [ScamTypeResponseDto] })
  getScamTypes(): Promise<ScamTypeResponseDto[]> {
    return this.requestProxy(this.url + 'v1/scams/types');
  }

  @Get('functions')
  @ApiResponse({ status: HttpStatus.OK, type: [ScamFunctionResponseDto] })
  getScamFunctions(): Promise<ScamFunctionResponseDto[]> {
    return this.requestProxy(this.url + 'v1/scams/functions');
  }
}
