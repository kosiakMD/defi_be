export interface IFetchPriceAssetRequest {
  address: string;
  tokenId: string;
}

export interface IFetchPriceRequest {
  assets: IFetchPriceAssetRequest[];
}
