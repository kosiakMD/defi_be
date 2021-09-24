import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, ChainNameEnum, ChainSymbols } from 'src/common/enum';

import { Chain } from '../../price/price.interfaces';

export class ChainDto implements Chain {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  id: ChainIdEnum;

  @ApiProperty({
    enum: ChainSymbols,
    enumName: 'ChainSymbolsEnum',
    example: ChainSymbols.ETH,
  })
  symbol: ChainSymbols;

  @ApiProperty({
    enum: ChainNameEnum,
    enumName: 'ChainSymbolNames',
    example: ChainNameEnum.ETH,
  })
  name: ChainNameEnum;
}
