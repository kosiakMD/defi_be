export type Address = string;

export type TokenSymbol = string;

export type DateString = string;

export interface BaseData<T = string> {
  userAddress: string;
  protocolName: string;
  protocolType: T;
}

export interface PlatformData {
  balancer: BaseData[];
  curve: BaseData[];
  sushiswap: BaseData[];
  uniswap: BaseData[];
}

export interface ERC20Token {
  address: string;
  chainId?: number;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
}

export interface ContractApproval {
  chainId: number;
  contractAddress: Address;
  amount: string;
  blockTimestamp: number;
  tokenAddress: ERC20Token;
}

export class ContractApprovalResponse {
  [key: string]: ContractApproval[];
}

export interface GasPrice {
  rapid: number;
  fast: number;
  standard: number;
  slow: number;
  timestamp: number;
}

export interface GasHistory {
  average: number;
  time: string;
}

export interface PoolToken {
  id: Address; // Ethereum,
  name: string;
  symbol: TokenSymbol;
  percentage: number;
}

export interface Token {
  id: number;
  isStable: number;
  name: string;
  coingeckoId: string;
  address: Address;
  decimals: number;
  abiTypeId: number;
  createdAt: string;
  price: number;
}

export interface APY {
  day: number;
  week: number;
  month: number;
}

export interface IL {
  day: number;
  dayUSD: number;
  week: number;
  weekUSD: number;
  month: number;
  monthUSD: number;
}

export interface Pool {
  id: string; // Ethereum
  projectName: string;
  reserveUSD: number;
  fee24h: number;
  tokens: PoolToken[];
  APY: APY;
  IL: IL;
}

export interface PriceHistoricalRequest {
  addresses: Address[];
  timestamps: DateString[];
}
