import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class FarmUpdateDto {
  @ApiProperty({ type: String, example: 'Curve' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiProperty({ type: String, example: 'https://curve.fi/' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  url?: string;

  @ApiProperty({ type: Boolean, example: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
