import { AmountAble, Base, ERC20Token, PoolToken, Transaction } from './transactions.interfaces';

export interface StakeTransaction extends Transaction<'stake'> {
  amount: number;
}

export interface UnStakeTransaction extends Transaction<'unStake'> {
  amount: number;
}

export interface ClaimTransaction extends Transaction<'claim'> {
  amount: number;
}

export interface PoolTokenStaked extends ERC20Token, AmountAble {}

export interface ClaimAbleToken extends ERC20Token {
  claimed?: string;
  claimable: string;
  priceUSD?: number;
}

export interface Staking extends Base<'staking'> {
  stakingPositions: StakingPosition[];
}

type StakingTransaction = StakeTransaction | UnStakeTransaction | ClaimTransaction;

export interface StakingPosition {
  address: string;
  poolId?: string;
  staked: string;
  lpToken: PoolTokenStaked;
  rewardToken: ClaimAbleToken;
  liquidityPoolTokens: PoolToken[];
  transactions?: StakingTransaction[];
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
