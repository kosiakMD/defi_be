import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class FindOneParamsDto {
  @ApiProperty({ type: Number, required: true, example: 1066834 })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  id: number;
}
