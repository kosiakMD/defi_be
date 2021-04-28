import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import {
  PriceBatchRequestDto,
  PriceQueryDto,
  PriceRequestDto,
  PriceResponseDto,
  PricesPayload,
} from './dto';
import { PriceService } from './prices.service';

@Controller('prices')
export class PricesController {
  constructor(private priceService: PriceService) {}

  @Get('/')
  @ApiOkResponse({ type: PriceResponseDto })
  get(@Query() query: PriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(query)
      : this.priceService.getCurrentPrices(query);
  }

  @Post('/')
  // @UsePipes(new ArrayValidationParseIntPipe('timestamps', { isOptional: true }))
  @ApiOkResponse({ type: PriceResponseDto })
  post(@Body() request: PriceRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = request;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(request)
      : this.priceService.getCurrentPrices(request);
  }

  @Post('/batch')
  @ApiOkResponse({ type: PriceResponseDto })
  postBatch(@Body() request: PriceBatchRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.priceService.getPricesInBatches(request);
  }
}
