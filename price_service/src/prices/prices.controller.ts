import { Request } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Body, Controller, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiResponse } from '@nestjs/swagger';

import { Logger } from '../common/Logger/Logger.service';

import {
  HistoricalPriceQueryDto,
  PriceBatchRequestDto,
  PriceRangeRequestDto,
  PriceResponseDto,
  PricesPayload,
  PostResponseDto,
  PriceRequestCurrentDto,
  CurrentPriceResponseDto,
  HistoricalPriceV2ResponseDto,
  PriceQueryDto,
  HistoricalPricesPayload,
} from './dto';
import { PriceService } from './prices.service';

@Controller('prices')
export class PricesController {
  constructor(
    private priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @Post('/')
  @ApiOkResponse({ type: CurrentPriceResponseDto })
  post(
    @Body() query: HistoricalPriceQueryDto,
    @Req() request: Request,
  ): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps?.length;

    this.logger.time(request.originalUrl);

    const response = isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(query)
      : this.priceService.getCurrentPrices(query);

    this.logger.timeEnd(request.originalUrl);

    return response;
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

  @Post('/range')
  @ApiResponse({ status: 200, type: PriceResponseDto })
  getPriceRange(
    @Body() query: PriceRangeRequestDto,
    @Req() request: Request,
  ): Promise<PriceResponseDto<HistoricalPricesPayload>> {
    this.logger.time(request.originalUrl);

    const response = this.priceService.getRangePrices(query);

    this.logger.timeEnd(request.originalUrl);
    return response;
  }

  @Post('/current')
  @ApiCreatedResponse({ type: PostResponseDto })
  @ApiBody({ type: [PriceRequestCurrentDto] })
  async postCurrentPrice(@Body() body: PriceRequestCurrentDto[]): Promise<PostResponseDto> {
    try {
      await this.priceService.updateCurrentPrice(body);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Asset price has been successfully updated',
      };
    } catch (error) {
      this.logger.error(error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error. Asset current price is not saved',
        error,
      };
    }
  }

  @Post('/fetch')
  @ApiOkResponse({ type: CurrentPriceResponseDto })
  postFetch(
    @Body() query: PriceQueryDto,
    @Req() request: Request,
  ): Promise<PriceResponseDto<PricesPayload>> {
    this.logger.time(request.originalUrl);

    const response = this.priceService.fetchPrices(query);

    this.logger.timeEnd(request.originalUrl);

    return response;
  }
}
