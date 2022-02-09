export type SundaeSwapResponse = {
  assetB: {
    assetId: string;
    policyId: string;
    assetName: string;
    decimals: number;
    ticker: string;
  };
  assetID: string;
  priceUSD: string;
};
