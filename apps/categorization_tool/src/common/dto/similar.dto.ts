import { ApiProperty } from '@nestjs/swagger';

export class SimilarDTO {
  @ApiProperty({ type: String })
  contract: string;
  @ApiProperty({ type: Number, example: 0.5 })
  minSimilarityRate: number;
}
