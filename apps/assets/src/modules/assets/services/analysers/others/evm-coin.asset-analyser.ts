import { AssetReference, ObjectOrPromise } from 'apps/assets/src/common/types';

import { CoinNames, CoinSymbols, isEVMChain, isZeroAddress } from '@app/common/utils';

import { AssetCategory } from '../../../enums/asset-category.enum';
import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

export class EvmCoinAssetAnalyser implements AssetAnalyser {
  canAnalyseAsset({ chainId, address }: AssetReference): ObjectOrPromise<boolean> {
    return isEVMChain(chainId) && isZeroAddress(address);
  }

  analyseAsset({ chainId }: AssetReference): ObjectOrPromise<AssetAnalysisResult> {
    return {
      name: CoinNames[chainId],
      symbol: CoinSymbols[chainId],
      decimals: 18,
      categories: [AssetCategory.NativeCoin],
    };
  }
}
