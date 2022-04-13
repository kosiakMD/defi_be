export interface poolData {
  decimals: number;
  mintAuthority: string;
  supply: string;
  tokens?: tokenData[];
}

export interface tokenData {
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
}

export interface tokens {
  tokenA: tokenDataGeneratedPool;
  tokenB: tokenDataGeneratedPool;
  tokenLp: tokenDataGeneratedPool;
}

interface tokenDataGeneratedPool {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface poolInfo {
  pool: { [key: string]: any };
  aq: { [key: string]: any };
  dd: { [key: string]: any };
  tokens: Partial<tokens>;
}
