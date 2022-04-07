export interface Farm {
  platform: string;
  method: string;
  address: string;
  lp: {
    mint: string;
    method?: string;
    decimals: number;
    supply: number;
    amount: number;
    value: number;
    price: number;
    assets: Asset[];
  };
  rewardAssets: Asset[];
  apr: number;
  additional: {
    replicaMint: string;
    famineTs: string;
    lastUpdateTs: string;
    annualRewardsRate: string;
    rewardsPerTokenStored: string;
    totalTokensDeposited: string;
    replicaFarms: Farm[];
  };
}

export interface Pool {
  _id: string;
  platform?: string;
  programId?: string;
  lp: {
    mint: string;
    method?: string;
    desimals: number;
    supply: number;
    value: number;
    price: number;
    assets: Asset[];
  };
}

export interface Asset {
  _id: string;
  mint: string;
  decimals: number;
  price: number;
  value: number;
  amount: number;
}

export interface SolanaToken {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  tags?: string[];
  extensions: {
    website: string;
    coingeckoId?: string;
  };
}

export interface MarinadePoolsResponse {
  [x: string]: Pool;
}

export interface MarinadeFarmsResponse {
  [x: string]: Farm;
}

export interface SolanaTokensResponse {
  name: string;
  logoURI: string;
  keywords: string[];
  timestamp: string;
  tokens: SolanaToken[];
}
