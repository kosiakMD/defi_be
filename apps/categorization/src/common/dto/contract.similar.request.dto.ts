import { ApiProperty } from '@nestjs/swagger';

export class ContractSimilarRequestDto {
  @ApiProperty({ type: String, example: '0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d' })
  address: string;

  @ApiProperty({ type: Number, example: '0.7', maximum: 1 })
  minRate: number;
}
