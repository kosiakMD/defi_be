import BigNumber from 'bignumber.js';

type Decimals = string | number;

export const toBN = (number): BigNumber => new BigNumber(number);

export const decimalsDivider = (decimals: Decimals): BigNumber => toBN(10).pow(decimals);

export const normalizeDecimals = (number: string, decimals: Decimals): number => {
  return Number(
    toBN(number) //
      .dividedBy(decimalsDivider(decimals))
      .toString(),
  );
};
