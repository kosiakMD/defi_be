import { Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import { ArrayValidationParseIntPipe } from '../pipes/ArrayValidationPersIntePipe';
import { PriceQueryDto, PriceRequestDto, PriceResponseDto, PricesPayload } from './dto';
import { PriceService } from './prices.service';

@Controller('prices')
export class PricesController {
  constructor(private priceService: PriceService) {}

  @Get('/')
  @ApiOkResponse({ type: PriceResponseDto })
  currentPrices(@Query() query: PriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(query)
      : this.priceService.getCurrentPrices(query);
  }

  @Post('/')
  @UsePipes(new ArrayValidationParseIntPipe('timestamps'))
  @ApiOkResponse({ type: PriceResponseDto })
  currentPricesWithPost(
    @Body() request: PriceRequestDto,
  ): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = request;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(request)
      : this.priceService.getCurrentPrices(request);
  }
}
