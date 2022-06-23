import { AssetReference } from '../../../../../common/types';

export interface AssetPriceProvider {
  canHandleCategories(codes: string[]): boolean;

  getPrices(chainId: number, assets: ComplexAsset[]): Promise<AssetPriceWithUnderlyingReserves[]>;
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

export type AssetPriceWithUnderlyingReserves = {
  asset: AssetReference;
  price: number;
  reserves: string[];
};
