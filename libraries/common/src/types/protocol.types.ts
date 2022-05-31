import { ChainAbbrEnum, FeatureEnum } from '../enum';
import { FeatureDtoType, Features } from './features.types';

export type ProtocolFeaturesInfo = {
  [key in keyof typeof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
};

export type ProtocolFeaturesData<T extends Features> = {
  [key in keyof typeof ChainAbbrEnum]?: FeatureDtoType<T>;
};

export type FeaturesType = FeatureEnum[] | ProtocolFeaturesInfo;
