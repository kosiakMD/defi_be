export interface PoolsTokensResponse {
  data: PoolsTokens;
}

export interface PoolsTokens {
  pools: Pool[];
  tokens: Token[];
}

export interface Pool {
  id: string;
  name: string;
  balances: string[];
  assignedCoins: string;
  assignedUnderlyingCoins: string;
  coinCount: string;
  stakingPool: string;
  coins: Token[];
  underlyingCoins: Token[];
  swapCoins: Token[];
  poolToken: Token;
  poolTokenSupply: string;
  virtualPrice: number;
}

export interface Token {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
}
