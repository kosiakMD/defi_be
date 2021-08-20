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
export const CHAIN_ID_ETH = 1;
export const CHAIN_BSC = 'bsc';
export const CHAIN_ID_BSC = 2;
export const PROJECT_UNISWAP = 'uniswap';
export const PROJECT_SUSHISWAP = 'sushiswap';
export const PROJECT_PANCAKE = 'Pancake V1';
export const PROJECT_PANCAKE_V2 = 'Pancake V2';
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

export function getIl(pairCurrent: Pair, pairPast: Pair): [number, number] {
  const t0PriceCurrent = pairCurrent.reserveUSD / 2 / pairCurrent.reserve0;
  const t1PriceCurrent = pairCurrent.reserveUSD / 2 / pairCurrent.reserve1;

  const t0PricePast = pairPast.reserveUSD / 2 / pairPast.reserve0;
  const t1PricePast = pairPast.reserveUSD / 2 / pairPast.reserve1;

  const lpRatio = pairPast.reserveUSD / pairCurrent.reserveUSD - 1;

  const t0PriceChange = t0PriceCurrent / t0PricePast;
  const t1PriceChange = t1PriceCurrent / t1PricePast;

  const valueOfPool = Math.pow(t0PriceChange, 50 / 100) * Math.pow(t1PriceChange, 50 / 100);
  const assetValue = t0PriceChange * (50 / 100) + t1PriceChange * (50 / 100);
  const impermanentLoss = (valueOfPool / assetValue - 1) * 100;
  const poolIlPercent = impermanentLoss * lpRatio;

  const holdValueUSD = pairPast.reserve0 * t0PriceCurrent + pairPast.reserve1 * t1PriceCurrent;
  const impermanentLossUSD = poolIlPercent * holdValueUSD;

  return [poolIlPercent, impermanentLossUSD];
}

export function mergeUniswapData(response: ResponseData): Pair[] {
  return [
    ...response.data.from0to1000,
    ...response.data.from1000to2000,
    ...response.data.from2000to3000,
  ];
}
