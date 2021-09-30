import { Exclude, Expose, Type } from 'class-transformer';

import { Address } from 'src/common/types';

import { TokenDto } from './token.dto';

@Exclude()
export class PairDto {
  @Expose()
  id: Address;

  @Expose()
  reserve0: string;

  @Expose()
  reserve1: string;

  @Expose()
  reserveUSD: string;

  @Expose()
  token0Price: string;

  @Expose()
  token1Price: string;

  @Expose()
  @Type(() => TokenDto)
  token0: TokenDto;

  @Expose()
  @Type(() => TokenDto)
  token1: TokenDto;

  @Expose()
  totalSupply: string;
}
