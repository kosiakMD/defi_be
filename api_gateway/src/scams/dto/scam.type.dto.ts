import { ApiProperty } from '@nestjs/swagger';

export class ScamTypeDto {
  @ApiProperty({ type: Number, example: 4 })
  id: number;

  @ApiProperty({ type: String, example: 'Exploit' })
  type: string;
}
