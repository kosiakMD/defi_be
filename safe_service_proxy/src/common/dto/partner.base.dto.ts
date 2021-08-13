import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class PartnerBaseDto {
  @Expose()
  @ApiProperty({ type: Number, example: 8 })
  id: number;

  @Expose()
  @ApiProperty({ type: String, example: 'Certik' })
  name: string;
}
