import { ApiProperty } from '@nestjs/swagger';
import { CurrencyEnum } from 'src/common/enum';

export class CurrencyDto {
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @ApiProperty({ type: String, example: CurrencyEnum.usd })
  name: string;
}
