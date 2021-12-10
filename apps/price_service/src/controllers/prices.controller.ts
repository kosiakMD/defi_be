import { Request } from 'express';

import { Body, Controller, Get, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import {
  HistoricalPriceQueryDto,
  PriceBatchRequestDto,
  PriceRangeRequestDto,
  PriceResponseDto,
  PricesPayload,
  PriceTimestampRequestDto,
  CurrentPricesPayload,
  PriceRequestCurrentDto,
  CurrentPriceResponseDto,
  HistoricalPriceV2ResponseDto,
  PriceQueryDto,
  HistoricalPricesPayload,
} from '../modules/prices/dto';
import { PriceUpdateResponseDto } from '../modules/prices/dto/price.update.responseDto';
import { PriceService } from '../modules/prices/prices.service';

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

  @Post('/timestamp')
  @ApiOkResponse({ type: HistoricalPriceV2ResponseDto })
  async getTimestampPrices(
    @Body() query: PriceTimestampRequestDto,
    @Req() request: Request,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    this.logger.time(request.originalUrl);
    const { chain, currency, assets, timestamp } = query;

    const response = await this.priceService.getPricesAtTimestamp(
      assets,
      timestamp,
      chain,
      currency,
    );

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

  // TODO: change to patch\put depends on logic
  @Post('/current')
  @ApiCreatedResponse({ type: PriceResponseDto })
  @ApiBody({ type: [PriceRequestCurrentDto] })
  async postCurrentPrice(@Body() body: PriceRequestCurrentDto[]): Promise<PriceUpdateResponseDto> {
    try {
      await this.priceService.updateCurrentPrice(body);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Asset price has been successfully updated',
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  @Get('/current')
  async getAllCurrentPrices() {
    try {
      return await this.priceService.getAllAssetsCurrentPrices();
    } catch (error) {
      this.logger.error(error);
      throw error;
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
