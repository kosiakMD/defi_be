import { IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class GetAssetRequest {
  @ApiProperty({
    type: Number,
    description: 'Text to search assets by name or symbol',
    example: 22,
    required: true,
  })
  @IsNotEmpty()
  chainId: number;

  @ApiProperty({
    type: String,
    description: 'Address to get or process an asset',
    example: '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    type: [Number],
    description: 'Timestamps on which historical prices have to be returned',
    required: false,
  })
  pricesAt?: number[];
}
