// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ResultStatus } from '@app/common';

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
