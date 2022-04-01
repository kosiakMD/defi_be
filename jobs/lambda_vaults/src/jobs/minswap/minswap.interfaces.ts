export type MinswapResponse = {
  data?: {
    topPools?: MinswapPool[];
  };
};

export interface MinswapPool {
  assetA: {
    currencySymbol: string;
    tokenName: string;
    metadata: {
      name: string;
      ticker: string;
      decimals: number;
    } | null;
  };
  assetB: {
    currencySymbol: string;
    tokenName: string;
    metadata: {
      name: string;
      ticker: string;
      decimals: number;
    } | null;
  };
  lpAsset: {
    currencySymbol: string;
    tokenName: string;
  };
  reserveA: number;
  reserveB: number;
  totalLiquidity: number;
  tradingFeeARP: number;
}
