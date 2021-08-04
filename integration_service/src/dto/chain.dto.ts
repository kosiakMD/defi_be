import { ApiProperty } from '@nestjs/swagger';
import { ChainNameEnum } from 'src/common/enum';

export class ChainDto {
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @ApiProperty({ type: String, example: ChainNameEnum.ethereum })
  name: string;
}
