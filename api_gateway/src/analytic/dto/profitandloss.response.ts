import { ApiProperty } from '@nestjs/swagger';

export class ProfitAndLossResponse {
  @ApiProperty({ type: Number, example: 87.3 })
  profitAndLoss: number;

  @ApiProperty({ type: Number, example: 14.5 })
  profitAndLoss24h: number;

  @ApiProperty({ type: Number, example: 0.92 })
  averageCost: number;

  @ApiProperty({ type: Boolean, example: true })
  isTracked: boolean;
}
