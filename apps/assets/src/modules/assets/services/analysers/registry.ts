import { CoingeckoAssetAnalyser } from './aggregators/coingecko.asset-analyser';
import { CoinmarketcapAssetAnalyser } from './aggregators/coinmarketcap.asset-analyser';
import { CardanoKoiosAssetAnalyser } from './chains/cardano-koios.asset-analyser';
import { CardanoRegistryAssetAnalyser } from './chains/cardano-registry.asset-analyser';
import { CardanoAssetAnalyser } from './chains/cardano.asset-analyser';
import { CosmosAssetAnalyser } from './chains/cosmos.asset-analyser';
import { EVMMetaDataStrategy } from './chains/evm.asset-analyser';
import { SolanaLabsAssetAnalyzer } from './chains/solana-labs.asset-analyser';
import { TerraAssetAnalyser } from './chains/terra.asset-analyser';
import { EvmCoinAssetAnalyser } from './coins/evm-coin.asset-analyser';
import { NonEvmCoinAssetAnalyser } from './coins/non-evm-coin.asset-analyser';
import { OneToOneUnderlyingExchangeRatePriceProvider } from './core/single-underlying/price-providers/one-to-one-exchange-rate.price-provider';
import { SingleUnderlyingGenericPriceProvider } from './core/single-underlying/price-providers/single-underlying-generic.price-provider';
import { SingleUnderlyingAssetAnalyser } from './core/single-underlying/single-underlying.asset-analyzer';
import { TrustWalletAssetAnalyser } from './icons/trust-wallet.asset-analyser';
import { CErc20AssetAnalyser } from './protocols/CErc20.asset-analyser';
import { MinSwapAssetAnalyser } from './protocols/minswap.asset-analyser';
import { SaberAssetAnalyser } from './protocols/saber.asset-analyser';
import { UniswapV2AssetAnalyser } from './protocols/uniswapv2.asset-analyser';

export const assetAnalysers = [
  CoingeckoAssetAnalyser,
  CoinmarketcapAssetAnalyser,

  CardanoAssetAnalyser,
  CardanoRegistryAssetAnalyser,
  CardanoKoiosAssetAnalyser,
  MinSwapAssetAnalyser,

  CosmosAssetAnalyser,
  EVMMetaDataStrategy,
  TerraAssetAnalyser,

  CErc20AssetAnalyser,
  EvmCoinAssetAnalyser,
  NonEvmCoinAssetAnalyser,

  TrustWalletAssetAnalyser,

  SaberAssetAnalyser,
  UniswapV2AssetAnalyser,
  SingleUnderlyingAssetAnalyser,
  SingleUnderlyingGenericPriceProvider,

  OneToOneUnderlyingExchangeRatePriceProvider,

  SolanaLabsAssetAnalyzer,
];
