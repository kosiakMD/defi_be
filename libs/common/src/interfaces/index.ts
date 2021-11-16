import {
  ChainIdEnum,
  LiquidityChangeTypeEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  ResultStatus,
} from '@app/common/enum';
import { PlatformPoolToken, PoolToken } from '@app/common/interfaces/transactions.interfaces';
import { Address, DateString, ProtocolName, TokenSymbol } from '@app/common/types';

export * from './assets.interfaces';
export * from './balance.interfaces';
export * from './entity.information.interfaces';
export * from './fee.interfaces';
export * from './integrations.interface';
export * from './staking.position.interfaces';
export * from './subgraph.response.base';
export * from './transactions.interfaces';
export * from './lending.position.interface';
export * from './leverage.farming.interface';

export interface BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolType: T;
  projectName: ProjectEnum;
  protocolName: ProtocolName;
}

export interface TokenCommon {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  isLp?: boolean;
}

export interface ERC20Token extends TokenCommon {
  totalSupply?: string;
}

export interface PoolTokenBase {
  id: Address;
  name?: string;
  symbol?: TokenSymbol;
  percentage?: number;
}

export interface LiquidityPositionPool {
  address: string;
  name?: string;
}

export interface LiquidityPosition {
  lpToken: ERC20Token;
  poolTokens: PlatformPoolToken[];
  lpTokenBalance: string;
  rewards?: PlatformPoolToken[];
  pool?: LiquidityPositionPool;
  exitedAt?: number;
  earnedFeeUSD?: number;
  project?: string;
}

export interface txs {
  type: LiquidityChangeTypeEnum;
  hash: Address;
  blockNumber: number;
  timestamp: number;
  liquidity: string;
  amountUSD: number;
  gasPrice: number;
  gasPriceUsd: number;
  gasUsed: number;
  lpTokenAddress: Address;
  tokens: PlatformPoolToken[];
}

export interface ContractApproval {
  contractAddress: Address;
  amount: string;
  blockTimestamp: number;
  // TODO: TBD
  token: ERC20Token;
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

export interface Token {
  id: number;
  is_stable: number; // eslint-disable-line camelcase
  name: string;
  coingecko_id: string; // eslint-disable-line camelcase
  address: Address;
  decimals: number;
  abi_type_id: number; // eslint-disable-line camelcase
  created_at: string; // eslint-disable-line camelcase
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
  id: number;
  address: Address;
  chain: ChainIdEnum;
  project: string;
  reserveUSD: number;
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
  chain: ChainIdEnum;
  apy: VaultAPY;
  tvl: number; //6974003.81675021
  lpToken: LPToken;
  liquidityPoolTokens: PoolTokenBase[];
  rewardToken: RewardToken;
}

export interface TokenHistorical {
  addresses: Address;
  timestamps: DateString[];
}

export interface DetailedResponse<T> {
  status: ResultStatus;
  errors: Error[] | string[] | any[];
  data: T;
}

export interface BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolName: ProtocolName;
  protocolType: T;
  stakingPositions?: any[];
  liquidityPositions?: LiquidityPosition[];
}

export class ContractApprovalResponse {
  [key: string]: ContractApproval[];
}
