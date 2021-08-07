import { ApiProperty } from '@nestjs/swagger';
import { ChainIdEnum, ChainNameEnum } from 'src/common/enum';

export class ChainDto {
  @ApiProperty({ type: Number, example: ChainIdEnum.eth })
  id: ChainIdEnum;

  @ApiProperty({ type: String, example: ChainNameEnum.eth })
  name: ChainNameEnum;
}
