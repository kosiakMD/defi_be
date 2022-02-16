export interface PoolAssetsQueryResp {
  total_share: string;
  assets: {
    info: {
      token?:{
        contract_addr: string;
      }
      native_token?:{
        denom: string;
      }
    }
    amount: string;
  } []
}

export interface PoolInfoQueryResp {
  alloc_point: string,
  astro_tokens_per_block: string;
  last_reward_block: number;
  current_block: number;
  accumulated_rewards_per_share: string;
  pending_astro_rewards: number;
  reward_proxy: string;
  pending_proxy_rewards: string;
  accumulated_proxy_rewards_per_share: string;
  proxy_reward_balance_before_update: string;
  orphan_proxy_rewards: string;
}
