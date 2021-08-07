import { ApiProperty } from '@nestjs/swagger';
import { ChainIdEnum } from 'src/common/enum';

import { ChainSymbolNames, ChainSymbols } from './enums';

export class ChainDto {
  @ApiProperty({ type: Number, example: ChainIdEnum.eth })
  id: ChainIdEnum;

  @ApiProperty({
    enum: ChainSymbols,
    enumName: 'ChainSymbolsEnum',
    example: ChainSymbols.ETH,
  })
  symbol: ChainSymbols;

  @ApiProperty({
    enum: ChainSymbolNames,
    enumName: 'ChainSymbolNames',
    example: ChainSymbolNames.ETH,
  })
  name: ChainSymbolNames;
}
