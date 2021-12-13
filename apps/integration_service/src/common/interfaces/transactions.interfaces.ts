// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ChainDto, FeatureEnum } from '@app/common';
import { IncomeLiquidityPosition } from '@app/common/dto/liquidity.position.dto';
import { ProjectEnum, ProtocolTypeEnum } from '@app/common/enum';
import { ProtocolName } from '@app/common/types';

export interface PriceAble {
  priceUSD?: number;
}

export interface AmountAble {
  amount?: string;
}

@Exclude()
export class ERC20Token {
  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  @Expose()
  address: string;
  @ApiProperty({ type: String, example: 'Ethereum' })
  @Expose()
  name: string;
  @ApiProperty({ type: String, example: 'ETH' })
  @Expose()
  symbol: string;
  @ApiProperty({ type: Number, example: 18 })
  @Expose()
  decimals: number;
  @ApiProperty({ type: String, example: '69393241' })
  @Expose()
  totalSupply?: string;
}

export class StakingErcToken extends ERC20Token {
  @ApiProperty({ type: Number, example: 3759.23 })
  price?: number = null;

  @ApiProperty({ type: Number, example: 1.2512 })
  value?: number;

  @ApiProperty({ type: String, example: '123.6534' })
  balance?: string;
}

export class BorrowToken extends ERC20Token {
  @ApiProperty()
  price: number;

  @ApiProperty()
  balance: string;

  @ApiProperty()
  value: number;
}

export interface PoolToken extends ERC20Token, AmountAble, PriceAble {
  reserve: string;
  percentage?: number;
}

export interface Asset extends ERC20Token {
  id: number;
  chainId: number;
  isTracked: boolean;
}

export class PoolTokenDto extends ERC20Token implements PoolToken {
  reserve: string;
  percentage?: number;
  priceUSD?: number;
  amount?: string;
}

export interface UniswapSubgraphLikeData {
  subgraphPools: Map<string, IncomeLiquidityPosition[]>;
  subgraphStaking?: Map<string, any>;
}

// export interface ClaimAbleToken extends ERC20Token {
//   claimed?: string;
//   claimable?: string;
//   priceUSD?: number;
// }
//
// export interface StakingPosition {
//   address: string;
//   poolId?: string;
//   staked: string;
//   lpToken?: ERC20Token;
//   rewardToken: ClaimAbleToken;
//   stakingToken?: StakingErcToken | LPToken;
//   liquidityPoolTokens?: PoolToken[];
// }

export class BaseData<T = keyof typeof ProtocolTypeEnum> {
  chain: ChainDto;
  userAddress: string;
  protocolType: T;
  projectName: ProjectEnum;
  protocolName?: ProtocolName;
  total?: number;
  feature?: FeatureEnum;
  items?: any[];
}

// export type TokenSymbol = string;

// export interface PlatformPoolToken {
//   address: string;
//   reserve: string;
//   name?: string;
//   symbol?: TokenSymbol;
//   percentage?: number;
//   decimals?: number;
//   totalSupply?: string;
//   priceUSD?: number;
//   amount?: string;
// }
