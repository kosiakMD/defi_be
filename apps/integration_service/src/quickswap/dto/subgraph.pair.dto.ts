import { Exclude, Expose, Type } from 'class-transformer';

import { Address } from '@app/common/types';

import { SubgraphTokenDto } from './subgraph.token.dto';

@Exclude()
export class SubgraphPairDto {
  @Expose()
  id: Address;

  @Expose()
  reserve0: string;

  @Expose()
  reserve1: string;

  @Expose()
  reserveUSD: string;

  @Expose()
  @Type(() => SubgraphTokenDto)
  token0: SubgraphTokenDto;

  @Expose()
  @Type(() => SubgraphTokenDto)
  token1: SubgraphTokenDto;

  @Expose()
  totalSupply: string;
}
