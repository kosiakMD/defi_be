import { Controller, Get, Query } from '@nestjs/common';
import { ProfitAndLossQueryDto } from './dto/profitandloss.query.dto';
import { ProfitAndLossService } from './profitandloss.service';
import { ApiResponse } from '@nestjs/swagger';
import { ProfitAndLossResponseDto } from './dto/profitandloss.response.dto';

@Controller('analytic')
export class AnalyticController {
  constructor(private service: ProfitAndLossService) {}

  @Get('')
  @ApiResponse({ status: 200, type: ProfitAndLossResponseDto })
  async getProfitAndLossValues(@Query() query: ProfitAndLossQueryDto): Promise<ProfitAndLossResponseDto> {
    return this.service.getProfitAndLoss(query.asset, query.addresses);
  }
}
