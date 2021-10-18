import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import { CurrencyDto } from './dto';
import { CurrencyService } from './services/currency.service';

@Controller('currencies')
export class CurrencyController {
  constructor(@Inject(CurrencyService) private readonly service: CurrencyService) {}

  @Get('/')
  @ApiOkResponse({ type: CurrencyDto, isArray: true })
  getAll(): Promise<CurrencyDto[]> {
    return this.service.getAll();
  }

  @Get('/quotes')
  async getAvailableCurrencies(): Promise<any> {
    return this.service.getAvailablePrices();
  }
}
