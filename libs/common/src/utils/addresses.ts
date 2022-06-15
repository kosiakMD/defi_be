import { PublicKey } from '@solana/web3.js';
import bech32 from 'bech32';
import { isAddress as isETHAddress, toChecksumAddress } from 'web3-utils';

import { Address } from '@app/common';

import { CARDANO_COIN_ADDRESS, ZERO_ADDRESS } from '../constant';
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
  milkomeda: isETHAddress as any,
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

export function isZeroAddress(address: Address) {
  return address === ZERO_ADDRESS;
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

export function isBech32LikeAddress(address: string, length?: number): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const { prefix } = bech32.decode(address, length);
    return ['addr', 'kava', 'secret', 'osmo', 'terra', 'cosmos'].includes(prefix);
  } catch {
    return false;
  }
}

export function isCardanoAddress(): boolean {
  // TODO: Method bellow does not count asset addresses so should be changed, temp fix
  return true;
  // return isBech32LikeAddress(address, 103) || address === CARDANO_COIN_ADDRESS;
}

export function isRoninAddress(address: string): boolean {
  return address.includes('ronin');
}

export function isKavaAddress(address: string): boolean {
  return isBech32LikeAddress(address);
}

export function isCosmosAddress(address: string): boolean {
  return isBech32LikeAddress(address);
}

export function isOsmosisAddress(address: string): boolean {
  return isBech32LikeAddress(address);
}

export function isSecretAddress(address: string): boolean {
  return isBech32LikeAddress(address);
}

export function isTerraAddress(address: string): boolean {
  return isBech32LikeAddress(address);
}

export function isSomeAddress(address: string) {
  const addressChecks = [isBech32LikeAddress, isCardanoAddress, isETHAddress, isSolAddress];
  for (const addressChecker of addressChecks) {
    if (addressChecker(address)) {
      return true;
    }
  }
  return false;
}

export function formatAddress(address: string): string {
  return isETHAddress(address) ? toChecksumAddress(address) : address;
}
