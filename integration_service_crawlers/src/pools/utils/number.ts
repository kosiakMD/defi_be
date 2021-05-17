import { BigNumber } from 'bignumber.js';

export function BNToDecimals(value: BigNumber, decimals = 18): BigNumber {
  return value.times(new BigNumber(10).exponentiatedBy(-decimals));
}

export function stringToDecimals(value: string, decimals = 18): BigNumber {
  const bigNumberValue: BigNumber = new BigNumber(value);
  return bigNumberValue.times(new BigNumber(10).exponentiatedBy(-decimals));
}
