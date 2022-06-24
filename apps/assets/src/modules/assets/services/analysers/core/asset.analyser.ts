import { AssetReference, ObjectOrPromise } from '../../../../../common/types';

import { AssetMetadata } from '../../../types/asset-metadata.type';

export interface AssetAnalyser {
  canAnalyseAsset(asset: AssetReference): ObjectOrPromise<boolean>;
  analyseAsset(asset: AssetReference): ObjectOrPromise<AssetAnalysisResult>;
}

export enum IconSource {
  trustWallet = 'trust-wallet',
  muesliSwapOverbookV2 = 'muesliswap-overbookv2',
  muesliSwapCardano = 'muesliswap-cardano',
  muesliSwapMilkomeda = 'muesliswap-milkomeda',
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

  displayName?: string;

  isTracked?: boolean;

  icons?: AssetIcon[];

  categories?: string[];
  underlying?: string[];
  metadata?: AssetMetadata;
};

export type AssetAnalysisResult = AssetAnalysis | undefined;
