import { isSolAddress } from '@app/common/utils';

import { AssetReference, ObjectOrPromise } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from './asset.analyser';

export abstract class SolanaBaseAssetAnalyser implements AssetAnalyser {
  canAnalyseAsset(asset: AssetReference): ObjectOrPromise<boolean> {
    return isSolAddress(asset.address);
  }

  abstract analyseAsset(asset: AssetReference): ObjectOrPromise<AssetAnalysisResult>;
}
