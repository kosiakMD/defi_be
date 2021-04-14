import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ChainDto, CurrencyDto, PriceDto, PriceQueryDto } from './dto/price.dto';
import { PricesPayload } from './interfaces/price.interfaces';
import { PricesService } from './prices.service';

@ApiTags('Prices')
@Controller('prices')
export class PricesController {
  constructor(private service: PricesService) {}

  @Get('/')
  @ApiOkResponse({ status: 200, type: PriceDto })
  getPrices(@Query() query: PriceQueryDto): Promise<PriceDto<PricesPayload>> {
    const currency = query.currency || 1;
    const chain = query.chain || 1;

    return this.service.getPrices(query.addresses, query.timestamps, chain, currency);
  }

  @Get('/chains')
  @ApiOkResponse({ type: ChainDto, isArray: true })
  getChains(): Promise<ChainDto[]> {
    return this.service.getChains();
  }

  @Get('/currencies')
  @ApiOkResponse({ type: ChainDto, isArray: true })
  getCurrencies(): Promise<CurrencyDto[]> {
    return this.service.getCurrencies();
  }
}
