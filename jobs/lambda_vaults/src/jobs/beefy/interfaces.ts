import { Address } from '@app/common';

export type BeefySupportedChains =
  | 'arbitrum'
  | 'avax'
  | 'bsc'
  | 'celo'
  | 'cronos'
  | 'fantom'
  | 'one'
  | 'heco'
  | 'moonriver'
  | 'polygon';

type BeefyVaultStatus = 'active';
type BeefyStratType = 'StratLp' | 'SingleStake' | 'StratMultiLP';

export interface IBeefyHttpApr {
  vaultApr: number;
  compoundingsPerYear: number;
  beefyPerformanceFee: number;
  vaultApy: number;
  lpFee: number;
  tradingApr: number;
  totalApy: number; // legacy and does not include trading fees, calculate if possible
}
export interface IBeefyHttpAprLegacy {
  totalApy: number;
}

export interface IBeefyHttpAprs {
  [vaultId: string]: IBeefyHttpApr | IBeefyHttpAprLegacy;
}

export interface IBeefyHttpVault {
  id: string;
  logo: string;
  name: string;
  token: string;
  tokenDescription: string;
  tokenAddress: Address;
  tokenDecimals: number;
  tokenDescriptionUrl: string;
  earnedToken: string;
  earnedTokenAddress: Address;
  earnContractAddress: Address;
  pricePerFullShare: number;
  tvl: number;
  oracle: string;
  oracleId: string;
  oraclePrice: number;
  depositsPaused: false;
  status: BeefyVaultStatus;
  platform: string;
  assets: string[];
  risks?: string[];
  stratType: BeefyStratType;
  addLiquidityUrl: string;
  buyTokenUrl: string;
  strategy: Address;
  lastHarvest: number;
  chain: BeefySupportedChains;
}

export interface IUniswapV2PoolInfo {
  reserve0: string;
  reserve1: string;
  token0: Address;
  token1: Address;
}

export interface IBeefyVaultInfo<T = string> {
  address?: Address;
  totalSupply: T;
  strategy: T;
  want: T;
  balance: T;
  getPricePerFullShare: T;
  decimals: T;
}

export interface IBeefyStrategyAssets<T = Address> {
  underlying: T[];
  output: T;
  want: T;
}

export interface IBeefyVaultDetails {
  vault: IBeefyVaultInfo;
  strategy: IBeefyStrategyAssets;
}

export interface IAssetDetailsResponse {
  prices: Map<Address, number>;
  totalSupplies: Map<Address, string>;
  pools: Map<Address, IUniswapV2PoolInfo>;
}
