import { AssetReference } from '../../../../../../common/types';

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

export interface AssetPriceProvider {
  canHandleCategory(code: string): boolean;
  getPrices(chainId: number, assets: ComplexAsset[]): Promise<AssetPrice[]>;
}
