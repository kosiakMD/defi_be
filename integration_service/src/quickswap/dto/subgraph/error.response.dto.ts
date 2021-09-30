import { Exclude, Expose } from 'class-transformer';

import { LocationDto } from './location.dto';

@Exclude()
export class ErrorResponseDto {
  @Expose()
  locations: LocationDto[];

  @Expose()
  message: string;
}
