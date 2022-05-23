export interface Asset {
  assetId: string;
  assetName: string;
  ticker: string;
  decimals: number;
}

export interface Pool {
  assetA: Asset;
  assetB: Asset;
  assetLP: Asset;

  apr?: number;
  fee?: string;
  quantityA?: string;
  quantityB?: string;
  quantityLP?: string;
  tvl?: number;
  name?: string;
  priceUSD?: string;
}

export interface ITokenAmount {
  unit: string;
  quantity: string;
}
