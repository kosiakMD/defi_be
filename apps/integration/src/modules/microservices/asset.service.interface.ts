import { Address } from '@app/common';

export interface AssetCategoryInterface {
  name: string;
  code: string;
}

export interface AssetHistoricalPriceInterface {
  price: number;
  timestamp: Date;
}

export interface AssetUnderlyingInterface {
  address: string;
  position: number;
  // reserves:
  // weight:
}

export interface AssetRequestInterface {
  chainId: number;
  address: string;
  pricesAt?: number[];
}

// Raw Return data from asset service
export interface AssetInterface {
  id: number;
  chainId: number;

  address: string;
  name?: string;
  symbol?: string;
  decimals: number;
  // totalSupply:

  displayName?: string;
  price?: number;
  rank?: number;
  icon?: string;

  //   isTracked: boolean;
  //   disabled: boolean;
  categories: AssetCategoryInterface[];
  //   historicalPrices: AssetHistoricalPriceInterface[];
  underlying: AssetUnderlyingInterface[];
}

// hydrated/assembled assets (attached underlying, etc)
export interface AssembledAssetInterface {
  id: number;
  chainId: number;

  address: string;
  decimals: number;
  name?: string;
  symbol?: string;
  totalSupply?: string;

  displayName?: string;
  price?: number;
  rank?: number;
  icon?: string;

  // lp metadata
  // position:
  // weight
  reserve?: number;

  // isTracked?: boolean;
  // disabled?: boolean;
  categories: AssetCategoryInterface[];
  //   historicalPrices?: AssetHistoricalPriceInterface[];
  underlying: AssembledAssetInterface[];
}

export interface AssetServiceInterface {
  getAsset(address: Address, chainId: number): Promise<AssembledAssetInterface>;
  getAssets(requests: AssetRequestInterface[]): Promise<[string, AssembledAssetInterface][]>;
}
