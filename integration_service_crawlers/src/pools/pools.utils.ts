import { Pair } from '../thegraph/uniswap/pair.interface';
import { ResponseData } from '../thegraph/uniswap/uniswap.subgraph';

export const TIMESTAMP_CURRENT = Math.trunc(Date.now() / 1000);
export const ONE_DAY_SECONDS = 86400;
export const TIMESTAMP_DAY_BEFORE_CURRENT: number = Math.trunc(TIMESTAMP_CURRENT - ONE_DAY_SECONDS);
export const TIMESTAMP_WEEK_BEFORE_CURRENT: number = Math.trunc(
  TIMESTAMP_CURRENT - ONE_DAY_SECONDS * 7,
);
export const TIMESTAMP_MONTH_BEFORE_CURRENT: number = Math.trunc(
  TIMESTAMP_CURRENT - ONE_DAY_SECONDS * 30,
);

export const CHAIN_ETH = 'eth';
export const CHAIN_BSC = 'bsc';
export const PROJECT_UNISWAP = 'uniswap';
export const PROJECT_SUSHISWAP = 'sushiswap';
export const PROJECT_PANCAKE = 'pancake';
export const PROJECT_BALANCER = 'balancer';
export const PROJECT_CURVE = 'curve';

export function getImpermanentLossUSD(reserveUSD: number, percent: number): number {
  return reserveUSD * (percent / 100);
}
export function getLastDayApy(total: number, history: number): number {
  return (history / total) * 100;
}
export function getLastWeekApy(total: number, history: number): number {
  return getLastDayApy(total, history) / 7;
}
export function getLastMonthApy(total: number, history: number): number {
  return getLastDayApy(total, history) / 30;
}
export function getLpTokenPrice(reserveUSD: number, totalSupply: number): number {
  return reserveUSD / totalSupply;
}
export function getImpermanentLossValue(currentValue: number, historyValue: number): number {
  return currentValue / historyValue - 1;
}
export function getImpermanentLossPercent(currentValue: number, historyValue: number): number {
  return getImpermanentLossValue(currentValue, historyValue) * 100;
}

export function mergeUniswapData(response: ResponseData): Pair[] {
  return [
    ...response.data.from0to1000,
    ...response.data.from1000to2000,
    ...response.data.from2000to3000,
  ];
}
