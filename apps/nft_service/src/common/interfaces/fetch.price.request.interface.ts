export interface IFetchPriceAssetRequest {
  collectionAddress: string;
  tokenId: string;
}

export interface IFetchPriceRequest {
  assets: IFetchPriceAssetRequest[];
}
