import BigNumber from 'bignumber.js';

export function toDecimals(amount: number, decimals: number): number {
  return amount * Math.pow(10, -decimals);
}

type Decimals = string | number;

export const toBN = (number): BigNumber => new BigNumber(number);

export const decimalsDivider = (decimals: Decimals): BigNumber => toBN(10).pow(decimals);

export const normalizeDecimals = (number: string, decimals: Decimals): number => {
  return toBN(number) //
    .dividedBy(decimalsDivider(decimals))
    .toNumber();
};

export const absoluteValue = (value): number => {
  if (value) {
    return value / 100;
  }
  return 0;
};

export const percentageValue = (value): number => {
  if (value) {
    return value * 100;
  }
  return 0;
};

/**
 * Simple APR to APY conversion. This does not take into account fees taken by the platform
 * i.e. if Beefy takes a 0.04% fee on every harvest.
 *
 * If numberOfCompounds is not supplied, the continuous compounding formula is used
 *
 * @param rateForPeriod percentage return for period (daily, weekly, monthly, or yearly APR)
 * @param numberOfCompounds number of compounds in that time span (yearly apr + 365 compounds is once per day)
 * @returns apy
 */
export const aprToApy = (rateForPeriod: number, numberOfCompounds?: number): number => {
  if (numberOfCompounds) {
    return (1 + rateForPeriod / numberOfCompounds) ** numberOfCompounds - 1 || 0;
  }

  // TODO: how to handle degen APY, currently greater than 80,000 APR results in infinity
  return Math.pow(Math.E, rateForPeriod) - 1;
};

/**
 * Simple APY to APR conversion. This does not take into account fees taken by the platform
 * i.e. if Beefy takes a 0.04% fee on every harvest.
 * The inverse of the above function (aprToApy)
 *
 * If numberOfCompounds is not supplied, the continuous compounding formula is used
 *
 * @param rateForPeriod percentage return for period (daily, weekly, monthly, or yearly APR)
 * @param numberOfCompounds number of compounds in that time span (yearly apr + 365 compounds is once per day)
 * @returns apy
 */
export const apyToApr = (rateForYear: number, numberOfCompounds?: number): number => {
  if (numberOfCompounds) {
    return (Math.pow(10, Math.log10(rateForYear + 1) / numberOfCompounds) - 1) * numberOfCompounds;
  }

  return Math.log(rateForYear + 1);
};
