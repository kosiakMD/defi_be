import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import {
  ChainDto,
  CurrencyDto,
  PriceQueryDto,
  PriceRequestDto,
  PriceResponseDto,
  PricesPayload,
  CurrentPriceResponseDto,
  HistoricalPriceResponseDto,
  PriceBatchRequestDto,
  PriceRangeRequestDto,
} from './dto';
import { CurrencyListDto } from './dto/currency.list.dto';
import { PricesService } from './prices.service';

@ApiTags('Prices')
@Controller('prices')
export class PricesController {
  constructor(private service: PricesService) {}

  @Get('/')
  @ApiOkResponse({ type: CurrentPriceResponseDto })
  getPrices(@Query() query: PriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.service.getPrices(query);
  }

  @Post('/')
  @ApiOkResponse({ type: HistoricalPriceResponseDto })
  getPricesWithPost(@Body() request: PriceRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.service.getPrices(request);
  }

  @Post('/batch')
  @ApiOkResponse({ type: HistoricalPriceResponseDto })
  getPricesInBatch(
    @Body() request: PriceBatchRequestDto,
  ): Promise<PriceResponseDto<PricesPayload>> {
    return this.service.getPricesInBatch(request);
  }

  @Post('/range')
  @ApiOkResponse({ type: HistoricalPriceResponseDto })
  getPricesInRange(
    @Body() request: PriceRangeRequestDto,
  ): Promise<PriceResponseDto<PricesPayload>> {
    return this.service.getPricesInRange(request);
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

  @Get('/currencies/quotes')
  @ApiOkResponse({ type: CurrencyDto, isArray: true })
  getCurrencyPrices(): Promise<CurrencyListDto> {
    return this.service.getCurrencyPrices();
  }
}
