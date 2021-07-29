import { ApiProperty } from '@nestjs/swagger';

import { ChainId, ChainSymbolNames, ChainSymbols } from './enums';

export class ChainDto {
  @ApiProperty({ type: Number, example: 1 })
  id: ChainId;

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
