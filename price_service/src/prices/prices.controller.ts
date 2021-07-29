import { Body, Controller, Get, Post, Query, Req, Inject } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
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
  constructor(
    private priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  // TODO: divide method because we have 2 different DTO for History and Current
  @Get('/')
  @ApiOkResponse({ type: CurrentPriceResponseDto })
  get(@Query() query: PriceQueryDto, @Req() request: Request): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    this.logger.time(request.originalUrl);

    const response = isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(query)
      : this.priceService.getCurrentPrices(query);

    this.logger.timeEnd(request.originalUrl);

    return response;
  }

  // TODO: divide method because we have 2 different DTO for History and Current
  @Get('/v2')
  @ApiOkResponse({ type: CurrentPriceV2ResponseDto })
  getV2(@Query() query: PriceQueryDto, @Req() request: Request): Promise<PriceResponseDto<PricesPayloadV2>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps && timestamps.length;

    this.logger.time(request.originalUrl);

    const response = isHistoricalPricesRequest
      ? this.priceService.getHistoricalPricesV2(query)
      : this.priceService.getCurrentPricesV2(query);

    this.logger.timeEnd(request.originalUrl);

    return response;
  }

  // TODO: divide method because we have 2 different DTO for History and Current
  @Post('/')
  // @UsePipes(new ArrayValidationParseIntPipe('timestamps', { isOptional: true }))
  @ApiOkResponse({ type: CurrentPriceResponseDto })
  post(@Body() query: PriceRequestDto, @Req() request: Request): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps?.length;

    this.logger.time(request.originalUrl);

    const response = isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(query)
      : this.priceService.getCurrentPrices(query);

    this.logger.timeEnd(request.originalUrl);

    return response;
  }

  // TODO: divide method because we have 2 different DTO for History and Current
  @Post('/v2')
  // @UsePipes(new ArrayValidationParseIntPipe('timestamps', { isOptional: true }))
  @ApiOkResponse({ type: CurrentPriceV2ResponseDto })
  postV2(@Body() query: PriceRequestDto, @Req() request: Request): Promise<PriceResponseDto<PricesPayloadV2>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps?.length;

    this.logger.time(request.originalUrl);

    const response = isHistoricalPricesRequest
      ? this.priceService.getHistoricalPricesV2(query)
      : this.priceService.getCurrentPricesV2(query);

    this.logger.timeEnd(request.originalUrl);

    return response;
  }

  @Post('/nonLpTokens')
  @ApiOkResponse({ type: String, isArray: true })
  getNonLpTokens(): Promise<string[]> {
    return this.priceService.getNonLpTokens();
  }

  @Post('/batch')
  @ApiOkResponse({ type: HistoricalPriceV2ResponseDto })
  postBatch(
    @Body() query: PriceBatchRequestDto,
    @Req() request: Request,
  ): Promise<PriceResponseDto<PricesPayload>> {
    this.logger.time(request.originalUrl);

    const response = this.priceService.getPricesInBatches(query);

    this.logger.timeEnd(request.originalUrl);

    return response;
  }
}
