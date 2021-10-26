// eslint-disable-next-line max-classes-per-file
import { StakingErcToken } from '@app/common/dto/StakingErcToken';
import { ChainIdEnum, TransactionTypeEnum } from '@app/common/enum';
import { ERC20Token } from '@app/common/interfaces/index';
import { FeatureName, ProtocolName } from '@app/common/types';

import { AmountAble, PoolToken, Transaction } from './transactions.interfaces';

export interface StakeTransaction extends Transaction<TransactionTypeEnum.stake> {
  amount: number;
}

export interface UnStakeTransaction extends Transaction<TransactionTypeEnum.unStake> {
  amount: number;
}

export interface ClaimTransaction extends Transaction<TransactionTypeEnum.claim> {
  amount: number;
}

export interface PoolTokenStaked extends ERC20Token, AmountAble {}

export interface ClaimAbleToken extends ERC20Token {
  claimed?: string;
  claimable?: string;
  priceUSD?: number;
}

// todo: remove once pools job fixed
export interface StakingPosition {
  address: string;
  poolId?: string;
  staked: string;
  lpToken?: PoolTokenStaked;
  rewardToken?: ClaimAbleToken;
  stakingToken: StakingErcToken;
  liquidityPoolTokens?: PoolToken[];
}

export class NotifyPayloadStakingFeaturesDto {
  chain: ChainIdEnum;
  protocolName: ProtocolName;
  featureName: FeatureName;
  items: StakingPosition[];
}
