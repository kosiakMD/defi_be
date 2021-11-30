import { Address } from '@app/common';

export interface IAaveGenericToken {
  id: Address;
  underlyingAssetAddress: Address;
}

export interface IAaveTokens {
  atokens: IAaveGenericToken[];
  vtokens: IAaveGenericToken[];
  stokens: IAaveGenericToken[];
}
