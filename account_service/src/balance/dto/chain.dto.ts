import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { ChainSymbolNames, ChainSymbols } from '../../common/enum';
import { ChainId } from '../../common/types';

export class ChainDto {
  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
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
