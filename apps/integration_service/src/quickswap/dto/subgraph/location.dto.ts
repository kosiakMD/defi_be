import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class LocationDto {
  @Expose()
  line: number;

  @Expose()
  column: number;
}
