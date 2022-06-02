import { CoingeckoAssetAnalyser } from './aggregators/coingecko.asset-analyser';
import { CoinmarketcapAssetAnalyser } from './aggregators/coinmarketcap.asset-analyser';
import { CardanoAssetAnalyser } from './chains/cardano.asset-analyser';
import { CosmosAssetAnalyser } from './chains/cosmos.asset-analyser';
import { EVMMetaDataStrategy } from './chains/evm.asset-analyser';
import { SolanaAssetAnalyser } from './chains/solana.asset-analyser';
import { TerraAssetAnalyser } from './chains/terra.asset-analyser';
import { TrustWalletAssetAnalyser } from './icons/trust-wallet.asset-analyser';
import { SaberAssetAnalyser } from './protocols/saber.asset-analyser';
import { UniswapV2AssetAnalyser } from './protocols/uniswapv2.asset-analyser';

export const assetAnalysers = [
  CoingeckoAssetAnalyser,
  CoinmarketcapAssetAnalyser,

  CardanoAssetAnalyser,
  CosmosAssetAnalyser,
  EVMMetaDataStrategy,
  SolanaAssetAnalyser,
  TerraAssetAnalyser,

  TrustWalletAssetAnalyser,

  SaberAssetAnalyser,
  UniswapV2AssetAnalyser,
];
