// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ChainEnum, ChainSymbols } from 'src/common/enum';

export class CurrencyDto {
  @ApiProperty({ type: Number, example: 1 })
  id = 1;

  @ApiProperty({ type: String, example: 'usd' })
  name = 'usd';

  constructor(currency?: Partial<CurrencyDto>) {
    Object.assign(this, currency);
  }
}

export class CryptoCurrencyDto extends CurrencyDto {
  @ApiProperty({ type: Number, example: ChainEnum.eth })
  id = ChainEnum.eth;

  @ApiProperty({ type: String, example: ChainSymbols.eth })
  name = ChainSymbols.eth;

  constructor(currency?: Partial<CryptoCurrencyDto>) {
    super(currency);
    Object.assign(this, currency);
  }
}
