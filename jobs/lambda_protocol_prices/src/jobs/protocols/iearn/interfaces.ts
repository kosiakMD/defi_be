import { Address } from '@app/common';

export interface IVaultDetails {
  pricePerShare: number;
  vault: Address;
  token: Address;
}
