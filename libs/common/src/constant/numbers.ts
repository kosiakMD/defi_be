import BN from 'bn.js';

// Uniswap V3 Constants
export const ZERO = new BN(0);
export const ONE = new BN(1);
export const Q32 = new BN(2).pow(new BN(32));
export const Q96 = new BN(2).pow(new BN(96));
export const Q128 = new BN(2).pow(new BN(128));
export const Q256 = new BN(2).pow(new BN(256));
export const MaxUint256 = new BN(
  BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').toString(),
);
