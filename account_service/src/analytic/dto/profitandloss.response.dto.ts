import { ApiProperty } from '@nestjs/swagger';

import { ResultStatus } from '../../common/enum';

import { ProfitAndLoss } from './profitAndLoss';

export class ProfitAndLossResponseDTO {
  @ApiProperty({ enum: ResultStatus, enumName: 'ResultStatus', example: ResultStatus.ok })
  status: ResultStatus;
  @ApiProperty()
  errors: (Error | string)[];
  @ApiProperty()
  data: ProfitAndLoss;

  constructor(data?: Partial<ProfitAndLossResponseDTO>) {
    Object.assign(this, data);
  }
}
