import { PriceSourceStrategy } from '../enums/price-source-strategy.enum';
import { CoingeckoStrategy } from './coingecko.strategy';
import { DebankStrategy } from './debank.strategy';
import { SolanaScanStrategy } from './solana-scan.strategy';
import { SundaeSwapStrategy } from './sundae-swap.strategy';
import { Univ2SubgraphStrategy } from './univ2-subgraph.strategy';

type PriceStrategies =
  | typeof CoingeckoStrategy
  | typeof DebankStrategy
  | typeof SolanaScanStrategy
  | typeof SundaeSwapStrategy
  | typeof Univ2SubgraphStrategy;

const strategies = new Map<PriceSourceStrategy, PriceStrategies>([
  [PriceSourceStrategy.COINGECKO, CoingeckoStrategy],
  [PriceSourceStrategy.DEBANK, DebankStrategy],
  [PriceSourceStrategy.SOLANA_SCAN, SolanaScanStrategy],
  [PriceSourceStrategy.SUNDAESWAP, SundaeSwapStrategy],
  [PriceSourceStrategy.UNIV2_SUBGRAPH, Univ2SubgraphStrategy],
]);

export const getPriceStrategyType = (strategy: PriceSourceStrategy) => {
  const strategyType = strategies.get(strategy);
  if (!strategyType) {
    throw new Error(`Unknown strategy ${strategy}`);
  }
  return strategyType;
};
