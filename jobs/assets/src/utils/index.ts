import { BigNumber as BN } from 'bignumber.js';

export type Decimals = string | number;

export const normalizeDecimals = (value: string, decimals: Decimals): BN => new BN(value).div(new BN(10).pow(decimals));