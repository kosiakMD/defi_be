import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ProfitAndLossQueryDto } from '../modules/analytics/dto/profitandloss.query.dto';
import { ProfitAndLossResponseDTO } from '../modules/analytics/dto/profitandloss.response.dto';
import { ProfitAndLossService } from '../modules/analytics/profitandloss.service';

@ApiTags('Analytic')
@Controller('analytic')
export class AnalyticsController {
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
    description: 'chain 1 - Ethereum',
    example: 1,
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
