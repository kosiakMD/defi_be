import { PublicKey } from '@solana/web3.js';
import bech32 from 'bech32';
import { isAddress as isETHAddress } from 'web3-utils';

import { Address } from '@app/common';

import { ChainIdEnum } from '../enum';

// Extending ChainIdEnum so when new chains are added, validation is not forgotten
// TODO improve typings
// add validators for rest of chains
const addressValidators: typeof ChainIdEnum = {
  eth: isETHAddress as any,
  bnb: isETHAddress as any,
  plg: isETHAddress as any,
  ftm: isETHAddress as any,
  arbi: isETHAddress as any,
  avax: isETHAddress as any,
  gnosis: isETHAddress as any,
  celo: isETHAddress as any,
  mriver: isETHAddress as any,
  harm: isETHAddress as any,
  heco: isETHAddress as any,
  sol: isSolAddress as any,
  okex: isETHAddress as any,
  cro: isETHAddress as any,
  boba: isETHAddress as any,
  kcc: isETHAddress as any,
  opt: isETHAddress as any,
  near: isETHAddress as any,
  terra: isTerraAddress as any,
  klay: isETHAddress as any,
  fuse: isETHAddress as any,
  cardano: isCardanoAddress as any,
  metis: isETHAddress as any,
  ronin: isRoninAddress as any,
  cosmos: isCosmosAddress as any,
  kava: isKavaAddress as any,
  osmosis: isOsmosisAddress as any,
  secret: isSecretAddress as any,
  iotex: isETHAddress as any,
};

export function keepAddressesByChainId(addresses: string | string[], chainId: ChainIdEnum) {
  const addressArray = splitToAddressesArray(addresses);

  const validator = addressValidators[ChainIdEnum[chainId]];

  if (validator) {
    return addressArray.filter(validator);
  }
  return addressArray;
}
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

export function isCardanoAddress(address: string): boolean {
  return !!address.match(/^addr1.*/);
}
export function isRoninAddress(address: string): boolean {
  return !!address.match(/^ronin.*/);
}
export function isKavaAddress(address: string): boolean {
  return !!address.match(/^kava1.*/);
}

export function isCosmosAddress(address: string): boolean {
  return !!address.match(/^cosmos1.*/);
}

export function isOsmosisAddress(address: string): boolean {
  return !!address.match(/^osmo1.*/);
}

export function isSecretAddress(address: string): boolean {
  return !!address.match(/^secret1.*/);
}

export function isTerraAddress(address: string): boolean {
  try {
    if (address.match(/^terra.*/)) {
      return true;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { prefix: decodedPrefix } = bech32.decode(address);
    return decodedPrefix === 'terra';
  } catch {
    return false;
  }
}

export function isSomeAddress(address: string) {
  const addressChecks = [
    isCardanoAddress,
    isETHAddress,
    isSolAddress,
    isTerraAddress,
    isCosmosAddress,
    isKavaAddress,
    isOsmosisAddress,
    isSecretAddress,
  ];
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
