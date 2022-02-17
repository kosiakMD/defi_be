import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class FarmCreateDto {
  @ApiProperty({ type: String, example: 'Curve' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: String, example: 'https://curve.fi/' })
  @IsString()
  @IsNotEmpty()
  url = '';

  @ApiProperty({ type: Boolean, example: true })
  @IsBoolean()
  @IsOptional()
  isEnabled: boolean;
}
