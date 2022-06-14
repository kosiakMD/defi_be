import { Address } from '@app/common';

export interface Svg {
  id: string;
  svg: string;
}

interface Listing {
  seller: Address;
  buyer: Address;
  timePurchased: string;
  priceInWei: string;
}

export interface Id {
  id: string;
}

export interface GotchiOwned extends Id {
  gotchiId: string;
  name: string;
  modifiedNumericTraits: number[];
  listings: Listing[];
}

export interface PortalsOwned extends Id {
  hauntId: string;
  openedAt: string;
  historicalPrices: string[];
}

export interface User<G extends Id = GotchiOwned, P extends Id = PortalsOwned> {
  id: Address;
  gotchisOwned: G[];
  portalsOwned: P[];
}

export interface Aavegotchis {
  aavegotchis: Svg[];
}

export interface Users<U extends Id = User> {
  users: U[];
}

export interface Response<T = any> {
  data: T;
}
