import { ApiProperty } from '@nestjs/swagger';

import { ScamTypeDto } from './scam.type.dto';

export class ScamTypeResponseDto extends ScamTypeDto {
  @ApiProperty({ type: Number, example: 2467 })
  count: number;
}
