import { AssetReference, ObjectOrPromise } from '../../../../../common/types';

export interface AssetAnalyser {
  canAnalyseAsset(asset: AssetReference): ObjectOrPromise<boolean>;
  analyseAsset(asset: AssetReference): ObjectOrPromise<AssetAnalysisResult>;
}

export type AssetIcon = {
  url: string;
  source: string;
  label?: string;
};

type AssetAnalysis = {
  name?: string;
  symbol?: string;
  decimals?: number;

  isTracked?: boolean;
  rank?: number;

  icons?: AssetIcon[];

  categories?: string[];
  underlying?: string[];
  metadata?: any;
};

export type AssetAnalysisResult = AssetAnalysis | undefined;
