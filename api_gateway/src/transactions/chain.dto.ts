import { ApiProperty } from '@nestjs/swagger';

import { ChainSymbolNames, ChainSymbols } from './enums';
import { ChainIdEnum } from 'src/common/enum';

export class ChainDto {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
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
