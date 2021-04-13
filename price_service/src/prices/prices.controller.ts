import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import { PriceQueryDto } from './dto';
import { PriceResponseDto, PricesPayload } from './dto/price.response.dto';
import { PriceService } from './prices.service';

@Controller('prices')
export class PricesController {
  constructor(private priceService: PriceService) {}

  @Get('/')
  // TODO: Swagger documentation is not complete...
  @ApiOkResponse({ type: PriceResponseDto })
  currentPrices(@Query() query: PriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(query)
      : this.priceService.getCurrentPrices(query);
  }
}
