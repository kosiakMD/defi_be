export interface TokenPriceRequest {
  tokenAddress: string;
  timestamps: number[];
}

export interface TokenPriceResponse {
  [token: string]: number;
}

export interface TokenTimestampPrices {
  [timestamp: string]: number;
}

export interface HistoricalTokenPricesResponse {
  [token: string]: TokenTimestampPrices | string[];
}

export interface PoolPriceRequest {
  poolAddress: string;
  timestamps: number[];
}

export interface PoolPriceResponse {
  [pool: string]: number;
}

export interface PoolTimestampPrices {
  [timestamp: string]: number;
}

export interface HistoricalPoolPricesResponse {
  [pool: string]: PoolTimestampPrices | string[];
}
