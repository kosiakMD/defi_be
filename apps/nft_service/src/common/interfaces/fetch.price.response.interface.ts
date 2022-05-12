export interface IFetchPriceAssetResponse {
  address: string;
  tokenId: string;
  floorPrice: number;
  lastPrice: number;
  date: number;
}

export interface IFetchPriceResponse {
  assets: IFetchPriceAssetResponse[];
}
