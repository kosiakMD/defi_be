import { ApiProperty } from '@nestjs/swagger';

export class ChainDto {
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @ApiProperty({ type: String, example: 'ethereum' })
  name: string;
}
