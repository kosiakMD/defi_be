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
import { CurrentPriceResponseDto } from './dto/price.response.current.dto';
import { CurrentPriceV2ResponseDto } from './dto/price.response.v2.current.dto';
import { HistoricalPriceV2ResponseDto } from './dto/price.response.v2.historical.dto';
import { PriceService } from './prices.service';

@Controller('prices')
export class PricesController {
  constructor(private priceService: PriceService) {}

  // TODO: divide method because we have 2 different DTO for History and Current
  @Get('/')
  @ApiOkResponse({ type: CurrentPriceResponseDto })
  get(@Query() query: PriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(query)
      : this.priceService.getCurrentPrices(query);
  }

  // TODO: divide method because we have 2 different DTO for History and Current
  @Get('/v2')
  @ApiOkResponse({ type: CurrentPriceV2ResponseDto })
  getV2(@Query() query: PriceQueryDto): Promise<PriceResponseDto<PricesPayloadV2>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPricesV2(query)
      : this.priceService.getCurrentPricesV2(query);
  }

  // TODO: divide method because we have 2 different DTO for History and Current
  @Post('/')
  // @UsePipes(new ArrayValidationParseIntPipe('timestamps', { isOptional: true }))
  @ApiOkResponse({ type: CurrentPriceResponseDto })
  post(@Body() request: PriceRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = request;
    const isHistoricalPricesRequest = timestamps?.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(request)
      : this.priceService.getCurrentPrices(request);
  }

  // TODO: divide method because we have 2 different DTO for History and Current
  @Post('/v2')
  // @UsePipes(new ArrayValidationParseIntPipe('timestamps', { isOptional: true }))
  @ApiOkResponse({ type: CurrentPriceV2ResponseDto })
  postV2(@Body() request: PriceRequestDto): Promise<PriceResponseDto<PricesPayloadV2>> {
    const { timestamps } = request;
    const isHistoricalPricesRequest = timestamps?.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPricesV2(request)
      : this.priceService.getCurrentPricesV2(request);
  }

  @Post('/nonLpTokens')
  @ApiOkResponse({ type: String, isArray: true })
  getNonLpTokens(): Promise<string[]> {
    return this.priceService.getNonLpTokens();
  }

  @Post('/batch')
  @ApiOkResponse({ type: HistoricalPriceV2ResponseDto })
  postBatch(@Body() request: PriceBatchRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.priceService.getPricesInBatches(request);
  }
}
