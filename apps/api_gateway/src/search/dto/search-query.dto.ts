import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({ example: 'DAI', type: String })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  text: string;

  @ApiProperty({ example: 30, type: Number })
  @IsNumberString()
  @IsOptional()
  limit?: number;
}
