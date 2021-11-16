import BigNumber from 'bignumber.js';

type Decimals = string | number;

export const decimalsDivider = (decimals: Decimals): BigNumber => new BigNumber(10).pow(decimals);

export const normalizeDecimals = (number: string, decimals: Decimals): number => {
  return Number(
    new BigNumber(number) //
      .dividedBy(decimalsDivider(decimals))
      .toString(),
  );
};
