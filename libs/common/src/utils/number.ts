import BigNumber, { BigNumber as BN } from 'bignumber.js';

type Decimals = string | number;

export const toBN = (number): BigNumber => new BigNumber(number);

export const normalizeDecimals = (number: string, decimals: Decimals): number => {
  return Number(
    new BigNumber(number) //
      .dividedBy(decimalsDivider(decimals))
      .toString(),
  );
};

export const decimalsDivider = (decimals: Decimals): BigNumber => new BN(10).pow(decimals);
