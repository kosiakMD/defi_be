import { ApiProperty } from '@nestjs/swagger';
import { ChainIdEnum, ChainPrefixEnum } from 'src/common/enum';

export class ChainDto {
  @ApiProperty({ type: Number, example: ChainIdEnum.eth })
  id: ChainIdEnum;

  @ApiProperty({ type: String, example: ChainPrefixEnum.eth })
  name: ChainPrefixEnum;
}
