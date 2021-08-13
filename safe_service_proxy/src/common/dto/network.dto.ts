import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class NetworkDto {
  @Expose()
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @Expose()
  @ApiProperty({ type: String, example: 'Ethereum' })
  name: string;
}
