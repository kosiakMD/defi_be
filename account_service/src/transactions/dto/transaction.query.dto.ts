import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { splitToArray } from '../../utils/utils';

export class TransactionQueryDto {
  @IsOptional()
  @Transform(({ value }) => splitToArray(value).map((x) => parseInt(x, 10)))
  @IsInt({ each: true })
  @ApiProperty({
    type: Number,
    required: false,
    description: `Array of chains' IDs (comma separated)`,
  })
  chains;

  @IsNotEmpty()
  @IsString({ each: true })
  @Transform(({ value }) => splitToArray(value))
  @ApiProperty({
    type: String,
    required: true,
    description: 'Array of token / coin addresses (comma separated)',
    default:
      '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
  })
  addresses: string[];
}
