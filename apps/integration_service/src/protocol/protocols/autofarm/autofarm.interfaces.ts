import BigNumber from 'bignumber.js';

export interface AutofarmBalance {
  amount: string;
  id: string;
}

export interface AutofarmUser {
  balances: AutofarmBalance[];
  id: string;
  totalAmount: string;
}

export interface AutofarmTokenInfo {
  totalSupply: string;
  coefficient: string;
  priceAsset: string;
}

export interface AutofarmVaultPoolInfo {
  want: string;
  allocPoint: BigNumber;
  lastRewardBlock: BigNumber;
  accAUTOPerShare: BigNumber;
  strat: string;
}

export interface VaultUserInfo {
  shares: BigNumber;
  rewardDebt: BigNumber; //- claimable amount
}

export interface StakingInterface {
  poolNum: number;
  userAddress: string;
  amount?: string;
  contractAddress?: string;
  claimable?: string;
  isLp?: boolean;
  reserve0?: string;
  reserve1?: string;
  totalSupply?: string;
  token0?: string;
  token1?: string;
}

export interface TotalSupplies {
  [key: string]: BigNumber;
}

export interface TotalSuppliesResult {
  block: number;
  totalSupplies: TotalSupplies;
}

export interface UniswapPairReserves {
  reserve0: BigNumber;
  reserve1: BigNumber;
  blockTimestampLast: number;
}

export interface UniswapReservesData {
  [key: string]: UniswapPairReserves;
}

export interface UniswapReservesResult {
  block: number;
  reserves: UniswapReservesData;
}

export interface AutofarmPool {
  display: boolean;
  stratType: string;
  earnTxFee: number;
  allowDeposits: boolean;
  wantIsLP: boolean;
  farmName: string;
  categoryName: string;
  farm: string;
  farmContractAddress: string;
  farmABI: string;
  stratABI: string;
  wantName: string;
  wantAddress: string;
  earnedSymbol: string;
  borrowDepthDefault: number;
  wantDecimals: number;
  wantLink: string;
  controllerFeeText: string;
  platformFeeText: string;
  feeToAUTOStakingText: string;
  entranceFeeText: string;
  poolInfo: PoolInfo;
  totalAllocPoint: string;
  wantLockedTotal: string;
  lastEarnBlock: string;
  wantPrice: string;
  poolWantTVL: number;
  controllerFee: number;
  buybackrate: number;
  borrowDepth: number;
  borrowRate: number;
  supplyBal: string;
  borrowBal: string;
  suppliedBorrowedMultiple: {
    suppliedMultiple: number;
    borrowedMultiple: number;
  };
  totalVenusAPR: number;
  compoundsPerYear: number;
  optimalBlocksToCompoundAfter: number;
  APY: number;
  APR: number;
  poolAUTOPerBlock: string;
  poolUSDPerBlock: number;
  APR_AUTO: number;
  // eslint-disable-next-line camelcase
  APY_total: number;
  // eslint-disable-next-line camelcase
  APR_daily: number;
}

export interface PoolInfo {
  want: string;
  allocPoint: string;
  lastRewardBlock: string;
  accAUTOPerShare: string;
  strat: string;
}

export interface AutofarmApiPools {
  [key: number]: AutofarmPool;
}
