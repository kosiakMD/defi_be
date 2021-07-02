import { ResultStatus } from '../enum';

export type Address = string;

export type TokenSymbol = string;

export type DateString = string;

export type Chain = number;

export type Chains = Chain[];

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

export interface TokenCommon {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  isLp?: boolean;
}

export interface ERC20Token extends TokenCommon {
  totalSupply?: number;
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

export interface PoolAPY {
  day: number;
  week: number;
  month: number;
}

export interface VaultAPY {
  year: number;
  month: number;
  day: number;
}

export interface IL {
  day: number;
  dayUSD: number;
  week: number;
  weekUSD: number;
  month: number;
  monthUSD: number;
}

export interface PoolTokenId {
  id: Address;
  totalSupply: number;
}

export interface Pool {
  id: string;
  address: Address;
  chain: string;
  project: string;
  apy: PoolAPY;
  il: IL;
  token: PoolTokenId;
  poolTokens: PoolToken[];
  createdAt: string;
  updatedAt: string;
}

export interface LPToken {
  id: Address;
  // name: string;
}

export interface RewardToken extends TokenCommon {
  id: Address;
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  priceUSD: number;
}

export interface Vault {
  id: string;
  vaultId: string;
  vaultName: string;
  project: string;
  chain: string;
  apy: VaultAPY;
  tvl: number; //6974003.81675021
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

export interface DetailedResponse<T> {
  status: ResultStatus;
  errors: Error[] | string[];
  data: T;
}
