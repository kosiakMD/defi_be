import { Body, Controller, Get, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import {
  CurrentPriceResponseDto,
  CurrentPricesPayload,
  HistoricalPriceQueryDto,
  HistoricalPricesPayload,
  HistoricalPriceV2ResponseDto,
  PriceBatchRequestDto,
  PriceQueryDto,
  PriceRangeRequestDto,
  PriceRequestCurrentDto,
  PriceResponseDto,
  PricesPayload,
  PriceTimestampRequestDto,
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
  post(@Body() query: HistoricalPriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    const { timestamps } = query;
    const isHistoricalPricesRequest = timestamps?.length;

    return isHistoricalPricesRequest
      ? this.priceService.getHistoricalPrices(query)
      : this.priceService.getCurrentPrices(query);
  }

  @Post('/batch')
  @ApiOkResponse({ type: HistoricalPriceV2ResponseDto })
  postBatch(@Body() query: PriceBatchRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.priceService.getPricesInBatches(query);
  }

  @Post('/timestamp')
  @ApiOkResponse({ type: HistoricalPriceV2ResponseDto })
  async getTimestampPrices(
    @Body() query: PriceTimestampRequestDto,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const { chain, currency, assets, timestamp } = query;
    return await this.priceService.getPricesAtTimestamp(assets, timestamp, chain, currency);
  }

  @Post('/range')
  @ApiResponse({ status: 200, type: PriceResponseDto })
  getPriceRange(
    @Body() query: PriceRangeRequestDto,
  ): Promise<PriceResponseDto<HistoricalPricesPayload>> {
    return this.priceService.getRangePrices(query);
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
  postFetch(@Body() query: PriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.priceService.fetchPrices(query);
  }
}
