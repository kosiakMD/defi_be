import { ApiProperty } from '@nestjs/swagger';

export class ImpermanentLossDto {
  @ApiProperty({ type: Number, example: -4.7689366516202996e-8 })
  day: number;

  @ApiProperty({ type: Number, example: -4.812988396744171 })
  dayUSD: number;

  @ApiProperty({ type: Number, example: -0.00001784266377352562 })
  week: number;

  @ApiProperty({ type: Number, example: -1930.9944095071426 })
  weekUSD: number;

  @ApiProperty({ type: Number, example: -0.000021083654804386624 })
  month: number;

  @ApiProperty({ type: Number, example: -2473.2069520851514 })
  monthUSD: number;
}
