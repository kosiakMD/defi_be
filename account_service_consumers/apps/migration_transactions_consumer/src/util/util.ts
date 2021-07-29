/* eslint @typescript-eslint/no-var-requires: "off" */
import BigNumber, { BigNumber as BN } from 'bignumber.js';

const Eth = require('web3-eth');
const eth = new Eth();

export type Chain = number;
type Decimals = string | number;

export const CHAIN_ID_ETH: Chain = 1;

export const DB_BLOCK_FROM = 12768337;
export const DB_BLOCK_TO = 12827635;

export const decimalsDivider = (decimals: Decimals): BigNumber => {
  if (Number(decimals) === 0) {
    return new BN(1);
  }
  return new BN(10).pow(decimals);
};

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ETH_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const ZERO_DATA = '0x';

export function fromHexToAddress(topic: string): string {
  return topic ? eth.abi.decodeParameter('address', topic).toLowerCase() : null;
}
