import { isAddress } from 'web3-utils';

import { AssetReference, ObjectOrPromise } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from './asset.analyser';

export abstract class EVMAssetAnalyser implements AssetAnalyser {
  canAnalyseAsset(asset: AssetReference): ObjectOrPromise<boolean> {
    return isAddress(asset.address);
  }

  abstract analyseAsset(asset: AssetReference): ObjectOrPromise<AssetAnalysisResult>;
}
