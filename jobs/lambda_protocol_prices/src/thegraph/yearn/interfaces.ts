import { Address } from '@app/common';

export interface BasicToken {
  id: Address;
  decimals: number;
}

export interface IYearnVaults {
  shareToken: BasicToken; // vault token
  token: BasicToken; // underlying asset
}
