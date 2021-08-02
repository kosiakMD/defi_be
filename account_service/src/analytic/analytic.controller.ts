import { Controller, Get, Query } from '@nestjs/common';
import { ProfitAndLossQueryDto } from './dto/profitandloss.query.dto';
import { ProfitAndLossService } from './profitandloss.service';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProfitAndLossResponseDto } from './dto/profitandloss.response.dto';

@ApiTags('Analytic')
@Controller('analytic')
export class AnalyticController {
  constructor(private service: ProfitAndLossService) {}

  @Get('')
  @ApiQuery({
    name: 'asset',
    type: String,
    description: 'asset address',
    example: '0xe61fdaf474fac07063f2234fb9e60c1163cfa850',
    required: true,
  })
  @ApiQuery({
    name: 'chain',
    type: Number,
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
  @ApiResponse({ status: 200, type: ProfitAndLossResponseDto })
  async getProfitAndLossValues(@Query() query: ProfitAndLossQueryDto): Promise<ProfitAndLossResponseDto> {
    return this.service.getProfitAndLoss(query.asset, query.chain, query.addresses);
  }
}
