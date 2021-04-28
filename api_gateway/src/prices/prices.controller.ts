import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  ChainDto,
  CurrencyDto,
  PriceQueryDto,
  PriceRequestDto,
  PriceResponseDto,
  PricesPayload,
} from './dto';
import { PriceBatchRequestDto } from './dto/priceBatch.request.dto';
import { PricesService } from './prices.service';

@ApiTags('Prices')
@Controller('prices')
export class PricesController {
  constructor(private service: PricesService) {}

  @Get('/')
  @ApiOkResponse({ type: PriceResponseDto })
  getPrices(@Query() query: PriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.service.getPrices(query);
  }

  @Post('/')
  @ApiOkResponse({ type: PriceResponseDto })
  getPricesWithPost(@Body() request: PriceRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.service.getPrices(request);
  }

  @Post('/batch')
  @ApiOkResponse({ type: PriceResponseDto })
  getPricesInBatch(
    @Body() request: PriceBatchRequestDto,
  ): Promise<PriceResponseDto<PricesPayload>> {
    return this.service.getPricesInBatch(request);
  }

  @Get('/chains')
  @ApiOkResponse({ type: ChainDto, isArray: true })
  getChains(): Promise<ChainDto[]> {
    return this.service.getChains();
  }

  @Get('/currencies')
  @ApiOkResponse({ type: CurrencyDto, isArray: true })
  getCurrencies(): Promise<CurrencyDto[]> {
    return this.service.getCurrencies();
  }
}
