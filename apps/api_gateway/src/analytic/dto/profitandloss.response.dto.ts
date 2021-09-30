import { ApiProperty } from '@nestjs/swagger';

import { DetailedResponseDto } from '../../common/DTO';
import { ResultStatus } from '../../common/enum';

import { ProfitAndLossResponse } from './profitandloss.response';

export declare class ProfitAndLossResponseDTO extends DetailedResponseDto<ProfitAndLossResponse> {
  @ApiProperty({ type: ResultStatus, example: ResultStatus.ok })
  status: ResultStatus;
  @ApiProperty()
  errors: Error[] | string[];
  @ApiProperty()
  data: ProfitAndLossResponse;
}
