import { BigNumber as BN } from 'bignumber.js';

export const DEFAULT_MULTIPLIER = 1e-18;
export const ETH_DECIMALS = 18;
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
export const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

export const CHAIN_ID_ETH = 1;
export const CHAIN_ID_BSC = 2;

export function getUniqueAndToLowerCaseArrayData(array: string[]): string[] {
  const temp: string[] = [];
  array.forEach((el) => {
    if (!temp.includes(el.toLowerCase())) {
      temp.push(el.toLowerCase());
    }
  });
  return temp;
}

type Decimals = string | number;

export const decimalsDivider = (decimals: Decimals) => new BN(10).pow(decimals);

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
