import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class EndpointCreateDto {
  @ApiProperty({ type: Number, example: 10 })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  chainId: number;

  @ApiProperty({
    type: String,
    example: 'https://speedy-nodes-nyc.moralis.io/173c906bbd79b4c01dc6034b/eth/mainnet',
  })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiProperty({ type: Boolean, example: true })
  @IsBoolean()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => value.toLowerCase() === 'true')
  isEnabled: boolean;

  @ApiProperty({ type: Number, example: 0 })
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  priority: number;
}
