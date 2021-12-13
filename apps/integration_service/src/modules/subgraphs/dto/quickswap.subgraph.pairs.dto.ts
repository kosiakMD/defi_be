import { Exclude, Expose } from 'class-transformer';

import { PairDto } from '../../protocols/protocols/quickswap/dto/pair.dto';

@Exclude()
export class PairsDto {
  @Expose()
  pairs: PairDto[];
}
