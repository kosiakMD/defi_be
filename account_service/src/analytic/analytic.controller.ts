import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum } from '../common/enum';

import { ProfitAndLossQueryDto } from './dto/profitandloss.query.dto';
import { ProfitAndLossResponseDTO } from './dto/profitandloss.response.dto';
import { ProfitAndLossService } from './profitandloss.service';

@ApiTags('Analytic')
@Controller('analytic')
export class AnalyticController {
  constructor(private service: ProfitAndLossService) {}

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
  @ApiResponse({ status: 200, type: ProfitAndLossResponseDTO })
  async getProfitAndLossValues(
    @Query() query: ProfitAndLossQueryDto,
  ): Promise<ProfitAndLossResponseDTO> {
    return this.service.getProfitAndLoss(query.asset, query.chain, query.addresses);
  }
}
