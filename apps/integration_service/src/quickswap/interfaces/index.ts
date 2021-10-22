import { PoolTokenDto } from '@app/common';

import { PairDto } from '../dto/subgraph';

export interface LPTokenPair extends PairDto {
  tokens: PoolTokenDto[];
}