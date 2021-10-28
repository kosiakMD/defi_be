import BigNumber from 'bignumber.js';

export function BNToDecimals(amount: BigNumber, decimals: number): BigNumber {
  return new BigNumber(amount).times(new BigNumber(10).pow(-Number(decimals)));
}

export function BnToFloat(amount: BigNumber, decimals: number): BigNumber {
  return amount.div(Math.pow(10, decimals));
}
