export interface Asset {
  assetId: string;
  policyId: string;
  assetName: string;
  decimals: number;
  ticker: string;
}

export interface Pool {
  assetA: Asset;
  assetB: Asset;
  assetLP: Asset;

  apr: number;
  fee: string;
  quantityA: string;
  quantityB: string;
  quantityLP: string;
}

export interface Staked {
  rewards: {
    asset: Asset;
    quantity: string;
  }[];
  rewardsMatured: {
    asset: Asset;
    quantity: string;
  }[];
  assetID: string;
  earned: string;
  quantity: string;
  nextRewardAt: {
    format: string;
  };
  pool: Pick<Pool, 'quantityA' | 'quantityB' | 'apr'>;
}

export type SundaeSwapPoolsResponse = {
  data: {
    pools: Pool[];
  };
  errors: {
    message: string;
  }[];
};

export interface SundaeSwapStakingResponse {
  data: {
    freezerOpen: {
      items: Staked[];
    };
  };
  errors: {
    message: string;
  }[];
}

