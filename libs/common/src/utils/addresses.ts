import { PublicKey } from '@solana/web3.js';
import { isAddress as isETHAddress } from 'web3-utils';

import { Address } from '@app/common';

export function splitToAddressesArray(addresses: string | any): Address[] {
  if (!addresses) {
    return [];
  }
  if (Array.isArray(addresses)) {
    return addresses.map(unifyAddress);
  }

  return addresses.split(',').map(unifyAddress);
}

// TODO: TBD why only if ETH valid pattern?
export function unifyAddress(address: Address) {
  return isETHAddress(address) ? address.toLowerCase().trim() : address;
}

export function unifyAddresses(addresses: Address[]) {
  return addresses.map(unifyAddress);
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

export function isSomeAddress(address: string) {
  const addressChecks = [isETHAddress, isSolAddress];
  for (const addressChecker of addressChecks) {
    if (addressChecker(address)) {
      return true;
    }
  }
  return false;
}

export function keepCardanoAddresses(addresses: Address[]): Address[] {
  return addresses.filter((address) => address.match(/^addr1.*/));
}
