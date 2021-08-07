import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChainIdEnum, ChainSymbolNames, ChainSymbols } from 'src/common/enum';

export class ChainDto {
  @ApiProperty({ type: Number, example: ChainIdEnum.eth })
  @Type(() => Number)
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
