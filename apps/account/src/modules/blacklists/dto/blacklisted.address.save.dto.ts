import { IsNotEmpty } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class BlacklistedAddressSaveDto {
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    required: true,
    description: 'address to add to blacklist',
    example: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
    default: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  })
  address: string;

  @IsNotEmpty()
  @ApiProperty({
    type: String,
    required: true,
    example: 'uniswap router',
  })
  comment: string;
}
