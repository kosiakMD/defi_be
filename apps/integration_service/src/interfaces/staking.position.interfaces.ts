import { ProtocolTypeEnum } from '@app/common/enum';

import { LPToken } from '../integrations/integrations.dto';
import {
  AmountAble,
  BaseData,
  ERC20Token,
  PoolToken,
  StakingErcToken,
} from './transactions.interfaces';

export interface PoolTokenStaked extends ERC20Token, AmountAble {}

export interface ClaimAbleToken extends ERC20Token {
  claimed?: string;
  claimable?: string;
  priceUSD?: number;
}

export interface StakingPosition {
  address: string;
  poolId?: string;
  staked: string;
  lpToken?: PoolTokenStaked;
  rewardToken?: ClaimAbleToken;
  stakingToken: LPToken | StakingErcToken;
  liquidityPoolTokens?: PoolToken[];
}

export interface Staking extends BaseData<ProtocolTypeEnum.staking> {
  stakingPositions: StakingPosition[];
}

export interface GraphQLStakingPositionPool {
  id: string;
  pair: string;
}
export interface GraphQLStakingPosition {
  id: string;
  pool: GraphQLStakingPositionPool;
  amount: string;
}

export interface StakingPositionResponse {
  data: {
    users: GraphQLStakingPosition[];
  };
}
