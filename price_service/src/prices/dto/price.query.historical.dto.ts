import { Transform } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { splitToNumberArray } from '../../utils/transform';
import { PriceQueryDto } from './price.query.dto';

export class HistoricalPriceQueryDto extends PriceQueryDto {
  @IsOptional()
  @IsInt({ each: true })
  @Transform(({ value }) => splitToNumberArray(value))
  @ApiProperty({
    type: String,
    required: false,
    description: 'Array of timestamps for historical prices (comma separated)',
    example: '1617138000,1617224400',
    default: '1617138000,1617224400',
  })
  timestamps: number[];
}
