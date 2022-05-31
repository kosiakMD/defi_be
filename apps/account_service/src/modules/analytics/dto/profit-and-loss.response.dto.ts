import { ApiProperty } from '@nestjs/swagger';

import { ResultStatus } from '@app/common/enum';

import { ProfitAndLoss } from './profit-and-loss';

export class ProfitAndLossResponseDto {
  @ApiProperty({ enum: ResultStatus, enumName: 'ResultStatus', example: ResultStatus.ok })
  status: ResultStatus;
  @ApiProperty()
  errors: (Error | string)[];
  @ApiProperty()
  data: ProfitAndLoss;

  constructor(data?: Partial<ProfitAndLossResponseDto>) {
    Object.assign(this, data);
  }
}
