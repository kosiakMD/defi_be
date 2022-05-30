export interface IMuesliSwapStakingPool {
  stakingPolicyId: string;
  stakingName: string;
  stakingDecimalPlaces: number;
  rewardPolicyId: string;
  rewardName: string;
  rewardDecimalPlaces: number;
  rewardSymbol: string;
  image: string;
  website: string;
  description: string;
  poolSize: number;
  poolEndTime: string;
  poolTitle: string;
  tokensLeft: number;
  amountStaked: string;
  poolId: string;
}

export interface IMuesliSwapStakingRewards {
  utxo_hash: string;
  utxo_index: string;
  amount_staked: number;
  amount_lovelace: number;
  reward: number;
  pool_id: string;
  staking_policy_id: string;
  staking_token_name: string;
  reward_policy_id: string;
  reward_token_name: string;
}

export interface IMuesliSwapTokenPrice {
  priceADA: number;
  priceADAAsk: number;
  priceADABid: number;
  priceADAChangeDay: number;
  priceADAChangeWeek: number;
  volumeADA: number;
}
