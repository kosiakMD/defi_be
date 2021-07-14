import { BadRequestException } from '@nestjs/common/exceptions';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PriceRequestDto {
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Chain or network id',
    example: 1,
    default: 1,
  })
  chain = 1;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @ApiProperty({
    type: Number,
    required: false,
    description: 'Currency Id',
    example: 1,
    default: 1,
  })
  currency = 1;

  @IsNotEmpty()
  @IsString({ each: true })
  @ApiProperty({
    type: () => [String],
    required: true,
    description: 'Array of token / coin addresses',
    example: [
      '0xbddab785b306bcd9fb056da189615cc8ece1d823',
      '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
    ],
    default: [
      '0xbddab785b306bcd9fb056da189615cc8ece1d823',
      '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
    ],
  })
  addresses: string[];

  @IsOptional()
  @Transform(({ value, key }) => {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`Wrong format of ${key} - is not an Array`);
    }
    return value.map((x) => parseInt(x));
  })
  @IsInt({ each: true })
  @ApiProperty({
    type: () => [Number],
    required: false,
    description: 'Array of timestamps for historical prices (comma separated)',
    example: [1617138000, 1617224400],
    default: [1617138000, 1617224400],
  })
  timestamps: number[];
}
