import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';

import { CurrencyDto } from '@app/common';

import { CurrencyService } from '../modules/lookup/currency.service';

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
