

import { PoolTokenDto } from 'src/integrations/integrations.dto';
import { PairDto } from '../dto/subgraph';

export interface LPTokenPair extends PairDto {
  tokens: PoolTokenDto[];
}
