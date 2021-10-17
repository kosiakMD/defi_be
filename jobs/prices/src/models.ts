export interface CurrentPrice {
  [key: string]: number;
}

export interface AssetPairReserveValue {
  baseAssetAddress?: string;
  baseAssetReserve: string;
  assetReserve: string;
  reserveUsd: number;
}