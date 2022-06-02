import { AbiItem, isAddress } from 'web3-utils';

import { AssetReference, ObjectOrPromise } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from './asset.analyser';

export abstract class EVMAssetAnalyser implements AssetAnalyser {
  canAnalyseAsset(asset: AssetReference): ObjectOrPromise<boolean> {
    return isAddress(asset.address);
  }

  abstract analyseAsset(asset: AssetReference): ObjectOrPromise<AssetAnalysisResult>;

  protected findAbiItem(abiItems: AbiItem[], name: string): AbiItem {
    return abiItems.find((item) => item.name === name);
  }
}
