import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class EndpointUpdateDto {
  @ApiProperty({ type: Number, required: false, example: 10 })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  chainId?: number;

  @ApiProperty({ type: Boolean, required: false, example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value.toLowerCase() === 'true')
  isEnabled?: boolean;

  @ApiProperty({ type: Number, required: false, example: 0 })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  priority?: number;
}
