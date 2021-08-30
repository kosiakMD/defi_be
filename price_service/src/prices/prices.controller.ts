import { Request } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Body, Controller, Get, HttpStatus, Inject, Post, Query, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';

import { Logger } from 'src/common/Logger/Logger.service';

import {
  PriceBatchRequestDto,
  PriceQueryDto,
  PriceRequestDto,
  PriceResponseDto,
  PricesPayload,
  PricesPayloadV2,
} from './dto';
import { PostResponseDto } from './dto/post.response.dto';
import { PriceRequestCurrentDto } from './dto/price.request.current.dto';
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
  get(
    @Query() query: PriceQueryDto,
    @Req() request: Request,
  ): Promise<PriceResponseDto<PricesPayload>> {
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
  getV2(
    @Query() query: PriceQueryDto,
    @Req() request: Request,
  ): Promise<PriceResponseDto<PricesPayloadV2>> {
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
  post(
    @Body() query: PriceRequestDto,
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

  // TODO: divide method because we have 2 different DTO for History and Current
  @Post('/v2')
  // @UsePipes(new ArrayValidationParseIntPipe('timestamps', { isOptional: true }))
  @ApiOkResponse({ type: CurrentPriceV2ResponseDto })
  postV2(
    @Body() query: PriceRequestDto,
    @Req() request: Request,
  ): Promise<PriceResponseDto<PricesPayloadV2>> {
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

  @Post('/current')
  @ApiCreatedResponse({ type: PostResponseDto })
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
}
