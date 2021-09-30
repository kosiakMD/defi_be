import { ApiProperty } from '@nestjs/swagger';

export class ProfitAndLoss {
  @ApiProperty({ type: Number, example: 87.3 })
  profitAndLoss: number;

  @ApiProperty({ type: Number, example: 14.5 })
  profitAndLoss24h: number;

  @ApiProperty({ type: Number, example: 0.92 })
  averageCost: number;

  constructor(data?: Partial<ProfitAndLoss>) {
    Object.assign(this, data);
  }
}
