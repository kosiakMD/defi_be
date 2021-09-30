import { ApiProperty } from '@nestjs/swagger';

export class AmountAbleDto {
  @ApiProperty({ type: String, example: '2335401', required: false })
  amount?: string;
}
