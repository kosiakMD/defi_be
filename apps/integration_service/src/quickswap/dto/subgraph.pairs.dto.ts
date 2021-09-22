import { Exclude, Expose, Type } from 'class-transformer';

import { UniswapLiquidityPositionPair } from '../../dto/liquidity.position.dto';
import { SubgraphPairDto } from './subgraph.pair.dto';

@Exclude()
export class SubgraphPairsDto {
  @Expose()
  @Type(() => SubgraphPairDto)
  pairs: UniswapLiquidityPositionPair[];
}
