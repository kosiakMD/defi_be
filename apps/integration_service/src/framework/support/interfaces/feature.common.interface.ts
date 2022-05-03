import { ChainId, FeatureEnum } from '@app/common';

export interface IFeatureLinks {
  opportunity?: string;
}

export interface IPartialBaseFeature<TOpportunityMeta = any> {
  feature: FeatureEnum;
  id?: string;
  chain: ChainId;
  meta?: TOpportunityMeta;
  links?: IFeatureLinks;
}
