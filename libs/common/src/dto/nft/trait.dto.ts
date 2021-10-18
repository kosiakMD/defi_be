import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class TraitDto {
  @Expose({ name: 'trait_type' })
  @ApiProperty({ example: 'Hand' })
  type: string;

  @Expose()
  @ApiProperty({
    example: 'Hot Pink Skateboard',
    description: 'Also can be a "number" type, like: 100',
  })
  value: string | string;

  @Expose({ name: 'max_value' })
  @ApiProperty({ example: '1000', description: 'Used only when the "value" is number' })
  maxValue: string;

  @Expose({ name: 'trait_count' })
  @ApiProperty({ example: 56 })
  count: number;
}
