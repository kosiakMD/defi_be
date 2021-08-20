import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ScamTypeDto } from './scam.type.dto';

@Exclude()
export class ScamTypeResponseDto extends ScamTypeDto {
  @Expose()
  @ApiProperty({ type: Number, example: 2467 })
  count: number;
}
