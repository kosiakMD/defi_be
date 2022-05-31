import { isSolAddress } from '@app/common/utils';
import { Web3SolanaProviderService } from '@app/common/web3provider';

import { AssetReference } from '../../../../../../common/types';

import { AssetAnalyser, AssetAnalysis } from './base.asset-analyser';

export abstract class SolanaAssetAnalyser implements AssetAnalyser {
  protected constructor(protected readonly web3Provider: Web3SolanaProviderService) {}

  abstract checkAsset(asset: AssetReference): Promise<AssetAnalysis> | AssetAnalysis;

  canCheckAsset(asset: AssetReference): Promise<boolean> | boolean {
    return isSolAddress(asset.address);
  }
}
