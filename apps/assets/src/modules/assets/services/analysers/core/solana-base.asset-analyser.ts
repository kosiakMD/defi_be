import { SOL_COIN_ADDRESS } from '@app/common/constant';
import { isSolAddress } from '@app/common/utils';

import { AssetReference, ObjectOrPromise } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from './asset.analyser';

export abstract class SolanaBaseAssetAnalyser implements AssetAnalyser {
  canAnalyseAsset({ address }: AssetReference): ObjectOrPromise<boolean> {
    // NOTE: Coin is handled separately
    return isSolAddress(address) && address !== SOL_COIN_ADDRESS;
  }

  abstract analyseAsset(asset: AssetReference): ObjectOrPromise<AssetAnalysisResult>;
}
