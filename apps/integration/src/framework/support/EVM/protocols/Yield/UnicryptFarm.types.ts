import type { Address } from '@app/common';

import type { IProtocolMeta } from '../../../interfaces';
import type { BaseWithTokens } from '../../../interfaces/new.interfaces';
import type {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../interfaces/tokens.rewarded.interface';
import type {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';

export interface IUnicryptFarmHttpSearchResponse {
  count: string; // '19'
  rows: [
    {
      id: number;
      spool_address: Address;
      stoken_address: Address;
      stoken_symbol: string;
      lp_factory: Address | null;
      num_stakers: number;
      stoken_balance: string; //'8008.848030477060274017';
      num_reward_pools: number;
      apy: number;
      tvl: number;
      meta: {
        creator: Address;
        staking_token: {
          address: Address;
          name: string;
          symbol: string;
          decimals: string; // '18';
          totalSupply: string; //'47650000000000000000000';
          isENMT: boolean;
        };
        min_staking_period: number;
        min_stake_amount: string; //'100000000000000000000';
        max_stake_amount: string; //'115792089237316195423570985008687907853269984665640564039457584007913129639935';
        unlock_tokens: boolean;
        num_stakers: string; //'25';
        num_reward_pools: string; //'4';
        max_reward_subscriptions: string; //'10';
        reward_creator: Address;
        shares_total: string; //'8008848030477060274017';
        share_weight_total: string; //'22550782540489304225531';
        boost_options: { time_period: number; boost_percentage: number }[]; //   { time_period: 2592000; boost_percentage: 1000 },
        uncl_fee_address: Address;
        uncl_token_address: Address;
        uncl_boost_max_percentage: string; //'10000';
        uncl_boost_max_amount: string; //'300000000000000000000';
        stake_mod_fee_allowed: boolean;
        stake_mod_fee_amount: string; // '0';
        stake_mod_fee_token: null;
        stake_mod_fee_address: string; //'0x0000000000000000000000000000000000000000';
        rewards: [
          {
            address: Address;
            symbol: string;
            reward_pool_address: Address;
            price: number; //0.9999999991743926;
            anualRewards: string; //'912523.483696';
            anualRewardsValue: number; // 912523.4829426139;
            apy: number; // 19.53;
          },
        ];
        pricing: { stoken: number };
        lp_meta: null;
        media: { icon: string; banner: string };
      };
      last_updated: string; //'2022-06-16T17:52:21.000Z';
    },
  ];
}

export type IUnicryptFarmSupplyTokenMinimal = ISupplyTokenMinimal<{ tvl: number }>;
export type IUnicryptFarmRewardTokenMinimal = IRewardTokenMinimal<{
  apr: number;
  rewardPool: Address;
}>;

export type IUnicryptFarmEntryMinimal = BaseWithTokens<
  IUnicryptFarmSupplyTokenMinimal,
  IUnicryptFarmRewardTokenMinimal[]
>;
export type IUnicryptFarmOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity[]
>;
export type IUnicryptFarmUserEntry = BaseWithTokens<ISupplyTokenUserEntry, IRewardTokenUserEntry[]>;

export interface UnicryptFarmMetaInterface extends IProtocolMeta {
  context: {
    search: string;
  };
}
