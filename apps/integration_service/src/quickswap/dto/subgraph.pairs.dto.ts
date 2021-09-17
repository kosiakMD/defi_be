import { Exclude, Expose, Type } from 'class-transformer';

import { SubgraphPairDto } from './subgraph.pair.dto';

@Exclude()
export class SubgraphPairsDto {
  @Expose()
  @Type(() => SubgraphPairDto)
  pairs: SubgraphPairDto[];
}
