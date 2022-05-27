import { FeatureEnum } from '@app/common';

import { IFeatureLinks } from './feature.common.interface';

interface Base {
  feature: FeatureEnum;
  token?: any; // lp token, beefy/yearn vault, aave atoken, etc. the receipt token you get after a deposit
  id: string | `${string}::${string}`; // unique id for investment. this is used as the cache key, so must be unique
  chain: number;
  links?: IFeatureLinks; // website, discord, twitter, etc
}

// TODO: rename 'meta' to 'extra'... meta is defined during registration,
// this is extra information pertaining to the pool
type BaseWithExtra<TExtra> = Base & (TExtra extends void ? { meta?: never } : { meta: TExtra });

type SupplyNone = { supplied?: never; supply?: never };
type SupplySingle<TSupplyToken> = { supplied?: never; supply: TSupplyToken };
type SupplyArray<TSupplyToken> = { supplied: TSupplyToken; supply?: never };

type RewardNone = { rewarded?: never; reward?: never };
type RewardSingle<TRewardToken> = { rewarded?: never; reward: TRewardToken };
type RewardArray<TRewardToken> = { rewarded: TRewardToken; reward?: never };

type BorrowNone = { borrowed?: never; borrow?: never };
type BorrowSingle<TBorrowToken> = { borrowed?: never; borrow: TBorrowToken };
type BorrowArray<TBorrowToken> = { borrowed: TBorrowToken; borrow?: never };

export type BaseWithTokens<
  TSupply,
  TReward = void,
  TBorrow = void,
  TExtra = void,
> = BaseWithExtra<TExtra> &
  (TSupply extends void
    ? SupplyNone
    : TSupply extends any[]
    ? SupplyArray<TSupply>
    : SupplySingle<TSupply>) &
  (TReward extends void
    ? RewardNone
    : TReward extends any[]
    ? RewardArray<TReward>
    : RewardSingle<TReward>) &
  (TBorrow extends void
    ? BorrowNone
    : TBorrow extends any[]
    ? BorrowArray<TBorrow>
    : BorrowSingle<TBorrow>);

// /** Examples */
// // staking
// export type IStakingMinimal<TExtra = never> = BaseWithTokens<
//   ISupplyTokenMinimal,
//   IRewardTokenMinimal[],
//   never,
//   TExtra
// >;
// export type IStakingOpportunity<TExtra = never> = BaseWithTokens<
//   ISupplyTokenOpportunity,
//   IRewardTokenOpportunity[],
//   never,
//   TExtra
// >;
// export type IStakingUser<TExtra = never> = BaseWithTokens<
//   ISupplyTokenUserEntry,
//   IRewardTokenUserEntry[],
//   never,
//   TExtra
// >;
