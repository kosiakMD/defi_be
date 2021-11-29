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
    return address.toLowerCase();
  } else {
    return address;
  }
}
