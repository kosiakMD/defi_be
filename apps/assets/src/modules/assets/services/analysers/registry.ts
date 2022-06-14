import { CoingeckoAssetAnalyser } from './aggregators/coingecko.asset-analyser';
import { CoinmarketcapAssetAnalyser } from './aggregators/coinmarketcap.asset-analyser';
import { CardanoRegistryAssetAnalyser } from './chains/cardano-registry.asset-analyser';
import { CardanoAssetAnalyser } from './chains/cardano.asset-analyser';
import { CosmosAssetAnalyser } from './chains/cosmos.asset-analyser';
import { EVMMetaDataStrategy } from './chains/evm.asset-analyser';
import { SolanaLabsAssetAnalyzer } from './chains/solana-labs.asset-analyser';
import { TerraAssetAnalyser } from './chains/terra.asset-analyser';
import { TrustWalletAssetAnalyser } from './icons/trust-wallet.asset-analyser';
import { EvmCoinAssetAnalyser } from './others/evm-coin.asset-analyser';
import { SaberAssetAnalyser } from './protocols/saber.asset-analyser';
import { UniswapV2AssetAnalyser } from './protocols/uniswapv2.asset-analyser';

export const assetAnalysers = [
  CoingeckoAssetAnalyser,
  CoinmarketcapAssetAnalyser,

  CardanoAssetAnalyser,
  CardanoRegistryAssetAnalyser,
  CosmosAssetAnalyser,
  EVMMetaDataStrategy,
  TerraAssetAnalyser,

  EvmCoinAssetAnalyser,

  TrustWalletAssetAnalyser,

  SaberAssetAnalyser,
  UniswapV2AssetAnalyser,
  SolanaLabsAssetAnalyzer,
];
