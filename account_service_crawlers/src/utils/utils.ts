import { BigNumber as BN } from 'bignumber.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Eth = require('web3-eth');
const eth = new Eth();

export type Chain = number;

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

export function fromHexToAddress(topic: string): string {
  return topic ? eth.abi.decodeParameter('address', topic).toLowerCase() : null;
}

export const BLOCKS_INFO = 'blocks_info';
export const BSC_BLOCKS_INFO = 'bsc_blocks_info';
export const ETH_BLOCKS = 'eth_blocks';
export const BSC_BLOCKS = 'bsc_blocks';
export const ETH_BSC_MIGRATION_STEP = 2;
export const BSC_NETWORK = 'bsc';
export const ETH_NETWORK = 'eth';
export const BSC_LAST_BLOCKS = 10;
export const ETH_LAST_BLOCKS = 3;

export const CHAIN_ID_ETH = 1;
export const CHAIN_ID_BSC = 2;

export function getUniqueAndToLowerCaseArrayData(array: string[]): string[] {
  const result = new Set(array);
  return Array.from(result);
}

type Decimals = string | number;

export const decimalsDivider = (decimals: Decimals): any => new BN(10).pow(decimals);

export const decimalsAmount = (amount: string, decimals: Decimals): number =>
  new BN(amount) //
    .div(decimalsDivider(decimals))
    .toNumber();

export const totalPrice = (amount: string, price: number, decimals: string | number): number =>
  new BN(amount) //
    .times(price)
    .div(decimalsDivider(decimals))
    .toNumber();
