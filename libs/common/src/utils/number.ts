import BigNumber from 'bignumber.js';

type Decimals = string | number;

export function decimalConverter(decimals: number) {
  return (number: number): number => Number(number) / 10 ** decimals;
}

export const decimalsDivider = (decimals: Decimals): BigNumber => new BigNumber(10).pow(decimals);
