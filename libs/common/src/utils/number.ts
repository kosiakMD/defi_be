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

/**
 * Simple APR to APY conversion. This does not take into account fees taken by the platform
 * i.e. if Beefy takes a 0.04% fee on every harvest.
 *
 * @param rateForPeriod percentage return for period (daily, weekly, monthly, or yearly APR)
 * @param numberOfCompounds number of compounds in that time span (yearly apr + 365 compounds is once per day)
 * @returns apy
 */
export const aprToApy = (rateForPeriod: number, numberOfCompounds: number): number => {
  return (1 + rateForPeriod / numberOfCompounds) ** numberOfCompounds - 1 || 0;
};

/**
 * Simple APY to APR conversion. This does not take into account fees taken by the platform
 * i.e. if Beefy takes a 0.04% fee on every harvest.
 * The inverse of the above function (aprToApy)
 *
 * @param rateForPeriod percentage return for period (daily, weekly, monthly, or yearly APR)
 * @param numberOfCompounds number of compounds in that time span (yearly apr + 365 compounds is once per day)
 * @returns apy
 */
export const apyToApr = (rateForYear: number, numberOfCompounds: number): number => {
  return (Math.pow(10, Math.log10(rateForYear + 1) / numberOfCompounds) - 1) * numberOfCompounds;
};
