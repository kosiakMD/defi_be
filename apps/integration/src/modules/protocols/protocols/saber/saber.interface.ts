export interface balance {
  quarryKey: string;
  authority: string;
  totalValueKey: string;
  rewardsEarned: string;
  rewardsPerTokenPaid: string;
  balance: string;
}

export interface quarryInfo {
  id: any;
  data: {
    lastUpdateTs: string;
    rewarderKey: string;
    tokenMintKey: string;
    index?: string;
    bump?: string;
    tokenMintDecimals: string;
    famineTs: string;
    lastCheckpointTs: string;
    rewardsPerTokenStored: string;
    rewardsShare: string;
    annualRewardsRate: string;
    numMiners?: string;
    totalTokensDeposited: string;
  };
}
