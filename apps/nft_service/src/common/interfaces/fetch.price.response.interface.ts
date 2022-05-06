export interface IFetchPriceAssetResponse {
  collectionAddress: string;
  tokenId: string;
  floorPrice: number;
  lastPrice: number;
}

export interface IFetchPriceResponse {
  assets: IFetchPriceAssetResponse[];
}
