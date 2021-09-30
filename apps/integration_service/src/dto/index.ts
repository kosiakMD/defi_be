// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ResultStatus } from '@app/common/enum';

export class MetaDto {
  @ApiProperty({ type: Number, required: false, example: 123.412, description: 'time in ms' })
  requestTime?: number;
  @ApiProperty({ type: Number, required: false, example: 123.412, description: 'time in ms' })
  queryTime?: number;
  @ApiProperty({ type: Number, required: false, example: 123.412, description: 'time in ms' })
  fetchTime?: number;
}

export class DetailedResponseDto<T = any> {
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
  errors: Error[] | string[] = [];

  data: T;
}

export class ResponseDto<T> extends DetailedResponseDto {
  // @ApiProperty({ type: MetaDto, required: false })
  // __meta?: MetaDto;

  data: T;
}
