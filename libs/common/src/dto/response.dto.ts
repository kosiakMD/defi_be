// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { DetailedResponse } from '@app/common/interfaces';

import { ResultStatus } from '../enum';

export class MetaDto {
  @ApiProperty({ type: Number, required: false, example: 123.412, description: 'time in ms' })
  requestTime?: number;
  @ApiProperty({ type: Number, required: false, example: 123.412, description: 'time in ms' })
  queryTime?: number;
  @ApiProperty({ type: Number, required: false, example: 123.412, description: 'time in ms' })
  fetchTime?: number;
}

// export class DetailedResponseDto<T = any> {
//   @ApiProperty({
//     enum: ResultStatus,
//     enumName: 'ResultStatus',
//     example: ResultStatus.ok,
//   })
//   status: ResultStatus = ResultStatus.ok;
//
//   @ApiProperty({
//     type: [String],
//     example: ['connect ECONNREFUSED ...'],
//   })
//   errors: Error[] | string[] = [];
//
//   data: T;
// }

// export class ResponseDto<T> extends DetailedResponseDto {
//   // @ApiProperty({ type: MetaDto, required: false })
//   // __meta?: MetaDto;
//
//   data: T;
// }

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
  status: ResultStatus = ResultStatus.ok;

  @ApiProperty({
    type: [String],
    example: ['connect ECONNREFUSED ...'],
  })
  errors: Error[] | string[] | any[] = [];

  @ApiProperty({
    isArray: true,
    type: Object,
  })
  data: T;
}

export class ResponseDto<T = any> extends DetailedResponseDto<T> {
  // @ApiProperty({ type: MetaDto, required: false })
  // __meta?: MetaDto;

  data: T;
}
