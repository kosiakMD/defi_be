import { Address, ChainId } from '@app/common';

export * from './asset-reference';
export * from './chain';
export * from './utils';

export type Univ2NetworkPriceProviderConfig = {
  chainId: ChainId;
  factory: Address;
  wrappedCoin: Address;
  stableCoins: Address[];
  proxyCoins?: Address[];
  minCap?: number;
};
