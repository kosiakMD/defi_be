import { AssetReference } from '../../../../../common/types';

export interface AssetPriceProvider {
  canHandleCategory(code: string): boolean;
  getPrices(chainId: number, assets: ComplexAsset[]): Promise<AssetPrice[]>;
}

export type ComplexAsset = {
  address: string;
  decimals: number;
  underlying: UnderlyingAsset[];
};

export type UnderlyingAsset = {
  address: string;
  decimals: number;
  price: number;
};

export type AssetPrice = {
  asset: AssetReference;
  price: number;
};
