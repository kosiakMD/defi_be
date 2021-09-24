// eslint-disable-next-line max-classes-per-file
import { Currency } from 'src/price/price.interfaces';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, ChainSymbols, CurrencyEnum, CurrencyIdEnum } from 'src/common/enum';

export class CurrencyDto implements Currency {
  @ApiProperty({ enum: CurrencyIdEnum, enumName: 'CurrencyIdEnum', example: CurrencyIdEnum.usd })
  id: CurrencyIdEnum = CurrencyIdEnum.usd;

  @ApiProperty({ enum: CurrencyEnum, enumName: 'CurrencyEnum', example: CurrencyEnum.usd })
  name: CurrencyEnum = CurrencyEnum.usd;

  constructor(currency?: Partial<CurrencyDto>) {
    Object.assign(this, currency);
  }
}

export class CryptoCurrencyDto /*extends CurrencyDto */ {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  id: ChainIdEnum = ChainIdEnum.eth;

  @ApiProperty({ enum: ChainSymbols, enumName: 'ChainSymbols', example: ChainSymbols.eth })
  name: ChainSymbols = ChainSymbols.eth;

  constructor(currency?: Partial<CryptoCurrencyDto>) {
    Object.assign(this, currency);
  }
}
