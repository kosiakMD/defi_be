import { PoolTokenDto } from '@app/common';

import { PairDto } from '../../subgraph';

export interface LPTokenPair extends PairDto {
  tokens: PoolTokenDto[];
}
