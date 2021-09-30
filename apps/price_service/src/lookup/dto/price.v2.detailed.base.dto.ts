import { ApiProperty } from '@nestjs/swagger';

export class PriceV2DetailedBaseDto {
  @ApiProperty({ type: String, example: 'COINGECKO' })
  platform: string;

  @ApiProperty({ type: Boolean, example: null })
  isLp: boolean;
}
