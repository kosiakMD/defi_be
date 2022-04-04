import { IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class AssetsMetadataDto {
  @ApiProperty({ type: String, example: 'CRO' })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({ type: String, example: 'CRO token' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: Number, example: 18 })
  @IsString()
  @IsNotEmpty()
  decimals: number;
}
