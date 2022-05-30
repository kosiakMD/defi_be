import { AssetReference } from '../../../../../../common/types';

export type AssetAnalysis = DoneAssetAnalysis | SkippedAssetAnalysis;

export type DoneAssetAnalysis = {
  done: true;
  categories?: string[];
  underlying?: string[];
  metadata?: any;
};

export type SkippedAssetAnalysis = {
  done: false;
};

export const UNKNOWN_ASSET: SkippedAssetAnalysis = {
  done: false,
};

export interface AssetAnalyser {
  canCheckAsset(asset: AssetReference): Promise<boolean> | boolean;
  checkAsset(asset: AssetReference): Promise<AssetAnalysis> | AssetAnalysis;
}
