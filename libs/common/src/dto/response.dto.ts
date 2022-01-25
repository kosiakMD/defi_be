// eslint-disable-next-line max-classes-per-file
import { HttpStatus } from '@nestjs/common';
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
  data: T;
}

export class ErrorResponseDto {
  @ApiProperty({
    enumName: 'HttpStatus',
    enum: HttpStatus,
    example: HttpStatus.INTERNAL_SERVER_ERROR,
  })
  statusCode: HttpStatus;

  @ApiProperty({
    type: String,
    example: 'connect ECONNREFUSED',
  })
  message: string;

  @ApiProperty({
    type: String,
    example: '2021-12-16T09:43:51.398Z',
  })
  timestamp: string;

  @ApiProperty({
    type: String,
    example: '/v1/protocol',
  })
  path: string;

  @ApiProperty({
    type: String,
    description: 'uuid generated at the Gateway entry point',
    example: '5da02c35-b815-450d-9ce3-c0503b69e3ba',
  })
  reqId: string;

  type?: string;
}
