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

export interface GotchiOwned {
  id: string;
  gotchiId?: string;
  name?: string;
  modifiedNumericTraits?: number[];
  listings?: Listing[];
}

export interface User {
  id: Address;
  gotchisOwned: GotchiOwned[];
}

export interface Aavegotchis {
  aavegotchis: Svg[];
}

export interface Users {
  users: User[];
}

export interface Response<T = any> {
  data: T;
}
