import { ApiProperty } from '@nestjs/swagger';

export class BaseEntityDto {
  @ApiProperty({ type: Number, example: 1066834 })
  id: number;

  @ApiProperty({ type: Date, example: '2022-01-25T14:21:57.003' })
  createdAt: Date;

  @ApiProperty({ type: Date, example: '2022-01-25T14:21:57.004' })
  updatedAt: Date;
}
