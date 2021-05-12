import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import {
  PriceBatchRequestDto,
  PriceQueryDto,
  PriceRequestDto,
  PriceResponseDto,
  PricesPayloadV2,
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

  @Get('/v2')
  @ApiOkResponse({ type: PriceResponseDto })
  getV2(@Query() query: PriceQueryDto): Promise<PriceResponseDto<PricesPayloadV2>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPricesV2(query)
      : this.priceService.getCurrentPricesV2(query);
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
