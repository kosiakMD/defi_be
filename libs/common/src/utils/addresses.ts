import { PublicKey } from '@solana/web3.js';
import { isAddress as isETHAddress } from 'web3-utils';

import { Address } from '@app/common';

export function splitToAddressesArray(addresses: string): Address[] {
  if (!addresses) {
    return [];
  }
  return addresses.split(',').map(unifyAddress);
}

export function unifyAddresses(addresses: Address[]) {
  return addresses.map((a) => {
    return unifyAddress(a);
  });
}

export function unifyAddress(address: Address) {
  if (isETHAddress(address)) {
    return address.toLowerCase().trim();
  } else {
    return address;
  }
}

export function keepSolAddresses(addresses: Address[]): Address[] {
  return addresses.reduce((ar, a) => {
    if (isSolAddress(a)) {
      ar.push(a);
    }
    return ar;
  }, []);
}

export function keepETHAddresses(addresses: Address[]): Address[] {
  return addresses.reduce((ar, a) => {
    if (isETHAddress(a)) {
      ar.push(a);
    }
    return ar;
  }, []);
}

export function isSolAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (e) {
    return false;
  }
}
