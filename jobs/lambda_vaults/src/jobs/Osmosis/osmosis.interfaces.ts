export interface PoolParams {
  swapFee: string;
  exitFee: string;
  smoothWeightChangeParams?: null;
}

export interface TotalShares {
  denom: string;
  amount: string;
}

export interface Token {
  denom: string;
  amount: string;
}

export interface PoolAsset {
  token: Token;
  weight: string;
}

export interface Pool {
  '@type': string;
  address: string;
  id: string;
  poolParams: PoolParams;
  future_pool_governor: string;
  totalShares: TotalShares;
  poolAssets: PoolAsset[];
  totalWeight: string;
}

export interface Pagination {
  next_key: string;
  total: string;
}

export interface PoolsResponse {
  pools: Pool[];
  pagination: Pagination;
}

export interface IFormatOpportunity {
  address: string;
  name: string;
  fee: string;
  reserve: string;
  totalWeight: string;
  tokens: {
    address: string;
    reserve: string;
    totalWeight: string;
  }[];
}
