import { CardanoTokenRegistryProvider } from './cardano-token-registry.provider';
import { CoingeckoAssetsProvider } from './coingecko-assets.provider';
import { CoinmarketcapAssetsProvider } from './coinmarketcap-assets.provider';
import { EVMCoinProvider } from './evm-coin.provider';
import { PriceStrategyUsedAssetsProvider } from './price-strategy-used-assets.provider';

export const trackedAssetsProviders = [
  CoingeckoAssetsProvider,
  CoinmarketcapAssetsProvider,
  CardanoTokenRegistryProvider,
  EVMCoinProvider,
  PriceStrategyUsedAssetsProvider,
];
