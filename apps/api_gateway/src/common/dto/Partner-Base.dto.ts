import { ApiProperty } from '@nestjs/swagger';

export class PartnerBaseDto {
  @ApiProperty({ type: Number, example: 8 })
  id: number;

  @ApiProperty({ type: String, example: 'Certik' })
  name: string;
}
