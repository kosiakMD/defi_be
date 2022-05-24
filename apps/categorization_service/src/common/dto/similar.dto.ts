import { ApiProperty } from '@nestjs/swagger';

export class SimilarDTO {
  @ApiProperty({ type: String })
  contract: string;
}
