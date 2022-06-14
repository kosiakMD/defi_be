import { CardanoTokenRegistryProvider } from './cardano-token-registry.provider';
import { CoinProvider } from './coin.provider';
import { CoingeckoAssetsProvider } from './coingecko-assets.provider';
import { CoinmarketcapAssetsProvider } from './coinmarketcap-assets.provider';
import { PriceStrategyAssetsProvider } from './price-strategy-assets.provider';
import { SolanaLabsAssetsProvider } from './solana-labs-assets.provider';
import { SolscanAssetsProvider } from './solscan-assets.provider';

export const trackedAssetsProviders = [
  CoingeckoAssetsProvider,
  CoinmarketcapAssetsProvider,
  CardanoTokenRegistryProvider,
  SolscanAssetsProvider,
  SolanaLabsAssetsProvider,
  CoinProvider,
  PriceStrategyAssetsProvider,
];
