import { AssetReference, ObjectOrPromise } from 'apps/assets/src/common/types';

import { ChainIdEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS, SOL_COIN_ADDRESS } from '@app/common/constant';
import { CoinNames, CoinSymbols } from '@app/common/utils';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

// NOTE: Seems like no better way than hard-coding this
export class NonEvmCoinAssetAnalyser implements AssetAnalyser {
  canAnalyseAsset({ chainId, address }: AssetReference): ObjectOrPromise<boolean> {
    return (
      (chainId === ChainIdEnum.sol && address === SOL_COIN_ADDRESS) ||
      (chainId === ChainIdEnum.cardano && address === CARDANO_COIN_ADDRESS)
    );
  }

  analyseAsset({ chainId }: AssetReference): ObjectOrPromise<AssetAnalysisResult> {
    switch (chainId) {
      case ChainIdEnum.sol:
        return {
          name: CoinNames[chainId],
          symbol: CoinSymbols[chainId],
          decimals: 9,
          categories: [AssetCategory.NativeCoin],
          isTracked: true,
          metadata: {
            coingeckoId: 'solana',
            coinmarketcapId: '5426',
          },
          icons: [
            {
              source: 'trustwallet',
              url: 'https://github.com/trustwallet/assets/raw/master/blockchains/solana/info/logo.png',
            },
            {
              source: 'coingecko',
              label: 'small',
              url: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
            },
            {
              source: 'coingecko',
              label: 'large',
              url: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
            },
          ],
        };
      case ChainIdEnum.cardano:
        return {
          name: CoinNames[chainId],
          symbol: CoinSymbols[chainId],
          decimals: 6,
          categories: [AssetCategory.NativeCoin],
          isTracked: true,
          metadata: {
            coingeckoId: 'cardano',
            coinmarketcapId: '2010',
          },
          icons: [
            {
              source: 'trustwallet',
              url: 'https://github.com/trustwallet/assets/raw/master/blockchains/cardano/info/logo.png',
            },
            {
              source: 'coingecko',
              label: 'small',
              url: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
            },
            {
              source: 'coingecko',
              label: 'large',
              url: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
            },
          ],
        };
    }
  }
}
