import { CardanoTokenRegistryProvider } from './cardano-token-registry.provider';
import { CoinProvider } from './coin.provider';
import { CoingeckoAssetsProvider } from './coingecko-assets.provider';
import { CoinmarketcapAssetsProvider } from './coinmarketcap-assets.provider';
import { MinSwapCardanoAssetsProvider } from './minswap-cardano-assets.provider';
import { PolkachuCosmosAssetsProvider } from './polkachu-cosmos-assets.provider';
import { PriceStrategyAssetsProvider } from './price-strategy-assets.provider';
import { SolanaLabsAssetsProvider } from './solana-labs-assets.provider';
import { SolscanAssetsProvider } from './solscan-assets.provider';

export const trackedAssetsProviders = [
  PolkachuCosmosAssetsProvider,
  CoingeckoAssetsProvider,
  CoinmarketcapAssetsProvider,
  CardanoTokenRegistryProvider,
  SolscanAssetsProvider,
  SolanaLabsAssetsProvider,
  CoinProvider,
  MinSwapCardanoAssetsProvider,
  PriceStrategyAssetsProvider,
];
