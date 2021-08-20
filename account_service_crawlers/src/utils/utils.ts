import BigNumber, { BigNumber as BN } from 'bignumber.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Eth = require('web3-eth');
const eth = new Eth();

export type Chain = number;

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ETH_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const ZERO_DATA = '0x';

export function fromHexToAddress(topic: string): string {
  return topic ? eth.abi.decodeParameter('address', topic).toLowerCase() : null;
}

export const DEFAULT_MULTIPLIER = 1e-18;
export const ETH_DECIMALS = 18;
export const ETH_BNB_ADDRESS = '0x0000000000000000000000000000000000000000';
export const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

export const BLOCKS_INFO = 'blocks_info';
export const BSC_BLOCKS_INFO = 'bsc_blocks_info';
export const ETH_BLOCKS = 'eth_blocks';
export const BSC_BLOCKS = 'bsc_blocks';
export const ETH_EVENTS = 'eth_events';
export const BSC_EVENTS = 'bsc_events';
export const ETH_TRANSACTIONS = 'eth_transactions';
export const BSC_TRANSACTIONS = 'bsc_blocks_transactions';
export const ETH_BSC_MIGRATION_STEP = 2;
export const BSC_NETWORK = 'bsc';
export const ETH_NETWORK = 'eth';
export const BSC_LAST_BLOCKS = 10;
export const ETH_LAST_BLOCKS = 3;

export const CHAIN_ID_ETH = 1;
export const CHAIN_ID_BSC = 2;

export const decimalsDividerV2 = (decimals: Decimals): BigNumber => {
  if (Number(decimals) === 0) {
    return new BN(1);
  }
  return new BN(10).pow(decimals);
};

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

export const getTokenDecimals = (decimals: number): number =>
  decimals ? Math.pow(10, -decimals) : DEFAULT_MULTIPLIER;
