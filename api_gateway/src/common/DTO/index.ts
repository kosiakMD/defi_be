import { ApiProperty } from '@nestjs/swagger';

import { ResultStatus } from '../enum';
import { DetailedResponse } from '../interfaces';

export * from './BaseData.dto';
export * from './ContractApproval.dto';
export * from './ERC20Token.dto';
export * from './EthereumAddress.dto';

export class DetailedResponseDto<T> implements DetailedResponse<T> {
  constructor(status: ResultStatus, errors: Error[] | string[], data: T) {
    this.status = status;
    this.errors = errors;
    this.data = data;
  }

  @ApiProperty({
    enum: ResultStatus,
    enumName: 'ResultStatus',
    example: ResultStatus.ok,
  })
  status: ResultStatus;

  @ApiProperty({
    example: ['connect ECONNREFUSED ...'],
  })
  errors: Error[] | string[];

  // @ApiProperty({
  // isArray: true,
  // type: Object,
  // })
  data: T;
}
