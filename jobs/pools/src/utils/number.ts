import BigNumber from 'bignumber.js';

export function BNToDecimals(amount: BigNumber, decimals): BigNumber {
  return new BigNumber(amount).times(new BigNumber(10).pow(-Number(decimals)));
}

export function toDecimals(amount, decimals): number {
  if (amount instanceof BigNumber) {
    return Number(amount.times(new BigNumber(10).pow(-Number(decimals))));
  }
  return Number(new BigNumber(amount).times(new BigNumber(10).pow(-Number(decimals))));
}
