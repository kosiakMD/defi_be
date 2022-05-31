import { Exclude, Expose } from 'class-transformer';

import { PairDto } from '../../protocol/protocols/quickswap/dto/pair.dto';

@Exclude()
export class PairsDto {
  @Expose()
  pairs: PairDto[];
}
