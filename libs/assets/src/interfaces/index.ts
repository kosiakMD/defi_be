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
  reserve?: number; // TODO: optional for now since its not included in the response at the time of writing, but should be required
  // weight:
}

export interface AssetRequestObjectInterface {
  chainId: number;
  address: string;
  // please use with caution, only for local development(!!!)
  forceUpdate?: boolean;
  pricesAt?: number[];
}

// Raw Return data from asset service
export interface AssetResponseObjectInterface {
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

  // isTracked: boolean;
  // disabled: boolean;
  categories: AssetCategoryInterface[];
  historicalPrices?: AssetHistoricalPriceInterface[];
  underlying: AssetUnderlyingInterface[];
}

export interface AssetRequestInterface {
  assets: AssetRequestObjectInterface[];
}
export interface AssetResponseInterface {
  assets: AssetResponseObjectInterface[];
}

// hydrated/assembled assets (attached underlying, etc)
export interface AssembledAssetInterface {
  id: number;
  chainId: number;

  address: string;
  decimals: number;
  name?: string;
  symbol?: string;
  totalSupply?: number;

  displayName?: string;
  price?: number;
  rank?: number;
  icon?: string;
  position?: number;

  // lp metadata
  // position:
  // weight
  reserve?: number;
  value?: number;

  categories: AssetCategoryInterface[];
  historicalPrices?: AssetHistoricalPriceInterface[];
  underlying: AssembledAssetInterface[];
}

export interface AssetServiceInterface {
  getAsset(address: Address, chainId: number): Promise<AssembledAssetInterface>;
  getAssets(requests: AssetRequestObjectInterface[]): Promise<[string, AssembledAssetInterface][]>;
}
