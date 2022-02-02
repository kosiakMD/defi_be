import { Body, Controller, Get, Injectable, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckResult } from '@nestjs/terminus';

import { ChainsDto } from '@app/common/dto/nft';

import { IBaseService } from '../common/interfaces/base-service.interface';
import { BaseService } from '../common/services/base.service';

import { PriceRangeRequestDto } from '../../../price_service/src/modules/prices/dto';
import { ChainDto } from './dto/chain.dto';
import { CurrencyDto } from './dto/currency.dto';
import { CurrencyListDto } from './dto/currency.list.dto';
import { PriceRequestDto } from './dto/price-request.dto';
import { PriceBatchRequestDto } from './dto/price.batch.request.dto';
import { CurrentPriceResponseDto } from './dto/price.response.current.dto';
import { PriceResponseDto, PricesPayload } from './dto/price.response.dto';
import { HistoricalPriceResponseDto } from './dto/price.response.historical.dto';

@ApiTags('Prices')
@Injectable()
@Controller('v1/prices')
export class PricesController extends BaseService implements IBaseService {
  url = this.buildUrl(
    this.configService.get<string>('PRICE_SERVICE_HOST'),
    this.configService.get<string>('PRICE_SERVICE_PORT'),
  );

  @Get('/status')
  @ApiOkResponse({ type: CurrentPriceResponseDto })
  isHealthy(): Promise<HealthCheckResult> {
    return this.requestProxy(this.url + 'v1/status');
  }

  @Get('/')
  @ApiOkResponse({ type: CurrentPriceResponseDto })
  getPrices(@Query() query): Promise<PriceResponseDto<PricesPayload>> {
    return this.requestProxy(this.url + 'v1/prices', 'POST', query);
  }

  @Post('/')
  @ApiOkResponse({ type: HistoricalPriceResponseDto })
  async getPricesWithPost(
    @Body() query: PriceRequestDto,
  ): Promise<PriceResponseDto<PricesPayload>> {
    return this.requestProxy(this.url + 'v1/prices', 'POST', query);
  }

  @Post('/batch')
  @ApiOkResponse({ type: HistoricalPriceResponseDto })
  getPricesInBatch(@Body() query: PriceBatchRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.requestProxy(this.url + 'v1/batch', 'POST', query);
  }

  @Post('/range')
  @ApiOkResponse({ type: HistoricalPriceResponseDto })
  getPricesInRange(@Body() query: PriceRangeRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    return this.requestProxy(this.url + 'v1/prices/range', 'POST', query);
  }

  @Get('/chains')
  @ApiOkResponse({ type: ChainDto, isArray: true })
  getChains(): Promise<ChainsDto[]> {
    return this.requestProxy(this.url + 'v1/chains');
  }

  @Get('/currencies')
  @ApiOkResponse({ type: CurrencyDto, isArray: true })
  getCurrencies(): Promise<CurrencyDto[]> {
    return this.requestProxy(this.url + 'v1/currencies');
  }

  @Get('/currencies/quotes')
  @ApiOkResponse({ type: CurrencyDto, isArray: true })
  getCurrencyPrices(): Promise<CurrencyListDto> {
    return this.requestProxy(this.url + 'v1/currencies/quotes');
  }
}
