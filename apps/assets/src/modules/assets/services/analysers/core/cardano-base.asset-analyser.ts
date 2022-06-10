import { ChainIdEnum } from '@app/common';

import { AssetReference, ObjectOrPromise } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from './asset.analyser';

export abstract class CardanoBaseAssetAnalyser implements AssetAnalyser {
  abstract analyseAsset(asset: AssetReference): ObjectOrPromise<AssetAnalysisResult>;

  public canAnalyseAsset({ chainId }: AssetReference): boolean {
    return chainId === ChainIdEnum.cardano;
  }
}
