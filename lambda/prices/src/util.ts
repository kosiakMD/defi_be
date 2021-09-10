import { BigNumber as BN } from 'bignumber.js';

export type Decimals = string | number;

export const decimalsDivider = (decimals: Decimals): any => new BN(10).pow(decimals);

export const decimalsReserve = (reserve: string, decimals: Decimals): string =>
  !decimals
    ? reserve
    : new BN(reserve) //
        .div(decimalsDivider(decimals))
        .toString();

export const toField = (index: number, length: number, chunkSize: number): number => {
  return index + chunkSize > length ? length : index + chunkSize;
};
