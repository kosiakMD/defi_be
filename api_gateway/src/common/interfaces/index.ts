import {
  ChainIdEnum,
  LiquidityChangeTypeEnum,
  PancakeProtocolEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  ResultStatus,
  SushiSwapProtocolEnum,
  TransactionTypeEnum,
  UniswapProtocolEnum,
} from '../enum';

export type Address = string;

export type TokenSymbol = string;

export type DateString = string;

export type Chain = ChainIdEnum;

export type Chains = ChainIdEnum[];

export type ProtocolName = PancakeProtocolEnum | SushiSwapProtocolEnum | UniswapProtocolEnum;

export interface BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolType: T;
  platformName: ProjectEnum;
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

export interface ClaimAbleToken extends ERC20Token {
  claimed?: string;
  claimable: string;
  priceUSD?: number;
}

export interface PoolTokenBase {
  id: Address;
  name?: string;
  symbol?: TokenSymbol;
  percentage?: number;
}

export interface PoolToken extends PoolTokenBase {
  reserve: string;
}

export interface Transaction<T = string> {
  type: T;
  hash: string;
  timestamp: number;
  blockNumber: number;
  gasUsed?: number;
  gasPrice?: number;
  gasPriceUsd?: number;
}

export interface StakeTransaction extends Transaction<TransactionTypeEnum.stake> {
  amount: number;
}

export interface UnStakeTransaction extends Transaction<TransactionTypeEnum.unStake> {
  amount: number;
}

export interface ClaimTransaction extends Transaction<TransactionTypeEnum.claim> {
  amount: number;
}

type StakingTransaction = StakeTransaction | UnStakeTransaction | ClaimTransaction;

export interface StakingPosition {
  address: string;
  poolId?: string;
  staked: string;
  lpToken: ERC20Token;
  rewardToken: ClaimAbleToken;
  liquidityPoolTokens: PoolToken[];
  transactions?: StakingTransaction[];
}

export interface PlatformPoolToken {
  address: string;
  reserve: string;
  name?: string;
  symbol?: TokenSymbol;
  percentage?: number;
  decimals?: number;
  totalSupply?: string;
  priceUSD?: number;
  amount?: string;
}

export interface LiquidityPool {
  address: string;
  name?: string;
}

export interface LiquidityPosition {
  lpToken: ERC20Token;
  poolTokens: PlatformPoolToken[];
  lpTokenBalance: string;
  pool?: LiquidityPool;
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

export interface GasHistoryResponse {
  [index: number]: GasHistory;
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

export interface TokensHistorical {
  [index: number]: TokenHistorical;
}

export interface DetailedResponse<T> {
  status: ResultStatus;
  errors: Error[] | string[];
  data: T;
}

export interface BaseData<T = keyof typeof ProtocolTypeEnum> {
  chainId: ChainIdEnum;
  userAddress: string;
  protocolName: ProtocolName;
  protocolType: T;
  stakingPositions?: StakingPosition[];
  liquidityPositions?: LiquidityPosition[];
  txs?: txs[];
}