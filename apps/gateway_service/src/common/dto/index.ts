import { ApiProperty } from '@nestjs/swagger';

import { ResultStatus } from '../enum';
import { DetailedResponse } from '../interfaces';

export * from './base-data.dto';
export * from './contract-approval.dto';
export * from './erc20-token.dto';
export * from './ethereum-address.dto';

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
    type: [String],
    example: ['connect ECONNREFUSED ...'],
  })
  errors: Error[] | string[];

  @ApiProperty({
    isArray: true,
    type: Object,
  })
  data: T;
}
