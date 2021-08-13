import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class ScamTypeDto {
  @Expose()
  @ApiProperty({ type: Number, example: 4 })
  id: number;

  @Expose()
  @ApiProperty({ type: String, example: 'Exploit' })
  type: string;
}
