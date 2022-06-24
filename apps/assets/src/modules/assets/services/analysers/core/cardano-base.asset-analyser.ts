import { ChainIdEnum } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';

import { AssetReference, ObjectOrPromise } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from './asset.analyser';

export abstract class CardanoBaseAssetAnalyser implements AssetAnalyser {
  abstract analyseAsset(asset: AssetReference): ObjectOrPromise<AssetAnalysisResult>;

  public canAnalyseAsset({ chainId, address }: AssetReference): boolean {
    // NOTE: Coin is handled separately
    return chainId === ChainIdEnum.cardano && address !== CARDANO_COIN_ADDRESS;
  }
}
