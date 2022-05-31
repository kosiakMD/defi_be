import { IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class ChainNetwork {
  @ApiProperty({ type: String, description: 'Network type' })
  @IsString()
  type: string;
}
