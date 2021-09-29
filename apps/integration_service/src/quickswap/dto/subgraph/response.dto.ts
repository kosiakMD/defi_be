import { Exclude, Expose, Type } from 'class-transformer';

import { SubgraphResponseBase } from '@app/common';

import { ErrorResponseDto } from './error.response.dto';

@Exclude()
export class ResponseDto<T> implements SubgraphResponseBase<T> {
  @Expose()
  data: T;

  @Expose()
  @Type(() => ErrorResponseDto)
  errors: ErrorResponseDto[];
}
