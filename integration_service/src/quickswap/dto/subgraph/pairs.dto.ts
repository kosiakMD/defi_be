import { Exclude, Expose } from 'class-transformer';

import { PairDto } from './pair.dto';

@Exclude()
export class PairsDto {
  @Expose()
  pairs: PairDto[];
}
