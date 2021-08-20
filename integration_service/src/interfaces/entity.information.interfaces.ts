export interface UniswapToken {
  decimals: string;
  id: string;
  name: string;
  symbol: string;
  percentage?: number;
}

export interface InformationTransaction {
  blockNumber: string;
  id: string;
  timestamp: string;
}

export interface Pair {
  id: string;
  token0: UniswapToken;
  token1: UniswapToken;
}

export interface InformationSnapshot {
  block: number;
  liquidityTokenBalance: string;
  liquidityTokenTotalSupply: string;
  pair: {
    id: string;
  };
  reserve0: string;
  reserve1: string;
  reserveUSD: string;
  timestamp: number;
  token0PriceUSD: string;
  token1PriceUSD: string;
  user: {
    id: string;
  };
}

export interface InformationSwap {
  amount0In: string;
  amount0Out: string;
  amount1In: string;
  amount1Out: string;
  amountUSD: string;
  from: string;
  logIndex: string;
  pair: Pair;
  sender: string;
  to: string;
  transaction: InformationTransaction;
}

export interface InformationMint {
  amount0: string;
  amount1: string;
  amountUSD: string;
  liquidity: string;
  pair: Pair;
  sender: string;
  to: string;
  transaction: InformationTransaction;
}

export interface InformationBurn {
  amount0: string;
  amount1: string;
  amountUSD: string;
  liquidity: string;
  pair: Pair;
  sender: string;
  to: string;
  transaction: InformationTransaction;
}

export interface BurnsInterface {
  id: number;
  blockNumber: number;
  createdAt: Date;
  information: InformationBurn;
  sender: string;
  toAddress: string;
}

export interface MintsInterface {
  id: number;
  blockNumber: number;
  createdAt: Date;
  information: InformationMint;
  sender: string;
  toAddress: string;
}

export interface SnapshotsInterface {
  id: number;
  userAddress: string;
  information: InformationSnapshot;
  blockNumber: number;
  createdAt: Date;
}

export interface SwapsInterface {
  id: number;
  blockNumber: number;
  createdAt: Date;
  information: InformationSwap;
  sender: string;
  toAddress: string;
  fromAddress: string;
}

export interface PoolToken {
  address: string;
  decimals: number;
  name: string;
  symbol: string;
  totalSupply: any;
  reserve: string;
  amount: string;
  priceUSD: number;
  percentage: number;
}
