import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class RPCParamsDto {
  @ApiProperty({ type: Number, example: 10 })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  chainId?: number;
}
