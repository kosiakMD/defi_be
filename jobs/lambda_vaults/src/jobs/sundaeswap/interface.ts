export type PoolsResponse = {
  data?: {
    poolsPopular?: Pool[];
  };
};

export interface Pool {
  assetA: {
    assetId: string;
    assetName: string;
    ticker: string;
    decimals: number;
  };
  assetB: {
    assetId: string;
    assetName: string;
    ticker: string;
    decimals: number;
  };
  assetLP: {
    assetId: string;
    assetName: string;
    ticker: string;
    decimals: number;
  };

  apr: number;
  fee: string;
  quantityA: string;
  quantityB: string;
  quantityLP: string;
  tvl: number;
  name: number;
  priceUSD: string;
}
