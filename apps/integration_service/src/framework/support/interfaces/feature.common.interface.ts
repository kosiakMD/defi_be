import { ChainId, FeatureEnum } from '@app/common';

export interface IPartialBaseFeature<TMeta = any> {
  feature: FeatureEnum;
  id?: string;
  chain: ChainId;
  meta?: TMeta;
}
