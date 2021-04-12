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

interface TokenCommon {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
}

export interface ERC20Token extends TokenCommon {
  totalSupply?: string;
}

export interface ContractApproval {
  contractAddress: Address;
  amount: string;
  blockTimestamp: number;
  token: ERC20Token;
}

export interface GasPrice {
  rapid: number;
  fast: number;
  standard: number;
  slow: number;
  timestamp: number;
}

export interface GasHistoryResponse {
  [index: number]: GasHistory;
}

export interface GasHistory {
  average: number;
  time: string;
}

export interface PoolToken {
  id: Address;
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

export interface LPToken {
  id: Address;
  name: string;
}

export interface RewardToken extends TokenCommon {
  priceUSD: number;
}

export interface Vault {
  id: Address;
  projectName: string; // enum e.g. 'curve'
  name: string;
  APY: APY;
  TVL: number; //6974003.81675021
  lpToken: LPToken;
  liquidityPoolTokens: PoolToken[];
  rewardToken: RewardToken;
}

export interface TokenHistorical {
  addresses: Address;
  timestamps: DateString[];
}

export interface TokensHistorical {
  [index: number]: TokenHistorical;
}
