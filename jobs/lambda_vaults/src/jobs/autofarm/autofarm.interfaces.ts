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
