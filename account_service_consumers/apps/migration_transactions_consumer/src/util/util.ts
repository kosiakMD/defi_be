import BigNumber, { BigNumber as BN } from 'bignumber.js';

export type Chain = number;
type Decimals = string | number;

export const CHAIN_ID_ETH: Chain = 1;

export const decimalsDivider = (decimals: Decimals): BigNumber => new BN(10).pow(decimals);

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ETH_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const ZERO_DATA = '0x';
