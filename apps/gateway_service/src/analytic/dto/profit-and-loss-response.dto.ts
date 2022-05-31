import { ApiProperty } from '@nestjs/swagger';

import { DetailedResponseDto } from '../../common/dto';
import { ResultStatus } from '../../common/enum';

import { ProfitAndLossResponse } from './profit-and-loss-response';

export declare class ProfitAndLossResponseDto extends DetailedResponseDto<ProfitAndLossResponse> {
  @ApiProperty({ type: ResultStatus, example: ResultStatus.ok })
  status: ResultStatus;
  @ApiProperty()
  errors: Error[] | string[];
  @ApiProperty()
  data: ProfitAndLossResponse;
}
