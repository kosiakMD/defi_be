import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum } from '../common/enum';
import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

import { ProfitAndLossResponseDTO } from './dto/profitandloss.response.dto';

@ApiTags('Analytic')
@Controller('v1/analytic')
export class AnalyticController extends BaseService implements IBaseService {
  url = this.buildUrl(
    this.configService.get<string>('ACCOUNT_SERVICE_HOST'),
    this.configService.get<string>('ACCOUNT_SERVICE_PORT'),
  );

  @Get()
  @ApiQuery({
    name: 'asset',
    type: String,
    description: 'asset address',
    example: '0xe61fdaf474fac07063f2234fb9e60c1163cfa850',
    required: true,
  })
  @ApiQuery({
    name: 'chain',
    enum: ChainIdEnum,
    enumName: 'ChainIdEnum',
    description: 'chain 1 - Ethereum',
    example: ChainIdEnum.eth,
    required: true,
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'list of bundled addresses',
    example: '0x1af067552304c2369037125466eeec6debe30b31',
    required: true,
  })
  @ApiResponse({ status: HttpStatus.OK, type: ProfitAndLossResponseDTO })
  async getProfitAndLossValues(@Query() query): Promise<ProfitAndLossResponseDTO> {
    return this.requestProxy(this.url + 'v1/analytic', 'GET', { params: query });
  }
}
