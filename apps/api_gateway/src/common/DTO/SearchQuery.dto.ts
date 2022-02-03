import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class SearchQueryDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: any) => value?.trim())
  @ApiProperty({ type: String, example: 'CRO' })
  text: string;
}
