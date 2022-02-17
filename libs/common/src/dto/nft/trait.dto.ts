import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class TraitDto {
  @Expose()
  @ApiProperty({ example: 'Hand' })
  type: string = null;

  @Expose()
  @ApiProperty({
    example: 'Hot Pink Skateboard',
    description: 'Also can be a "number" type, like: 100',
  })
  value: string | number = null;

  @Expose()
  @ApiProperty({
    example: '1000',
    description: 'Used only when the "value" is number',
    required: false,
  })
  maxValue?: string = null;

  @Expose()
  @ApiProperty({ example: 56, required: false })
  count?: number = null;

  @Expose()
  @ApiProperty({ example: 46.3, description: 'Percentage of owners' })
  percentageOfOwners?: number = null;
}
