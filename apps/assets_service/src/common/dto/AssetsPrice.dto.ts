import { ApiProperty } from '@nestjs/swagger';

export class AssetsPriceDto {
  @ApiProperty({ type: Number })
  price: number;

  @ApiProperty({ type: Number })
  sourceId: number;
}
