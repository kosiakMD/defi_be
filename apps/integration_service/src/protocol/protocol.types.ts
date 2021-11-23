import { ChainAbbrEnum, FeatureEnum } from '@app/common/enum';

export type ProtocolFeaturesInfo = {
  [key in keyof typeof ChainAbbrEnum]?: FeatureEnum[];
};

export type FeaturesType = FeatureEnum[] | ProtocolFeaturesInfo;
