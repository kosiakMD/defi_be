// export type ProtocolFeatures = Record<ChainAbbrEnum, FeatureEnum[]>;
import { ChainAbbrEnum } from '../enum';
import { FeatureEnum } from '../enum/feature.enum';
import { FeatureDto } from './features.types';

export type ProtocolFeaturesInfo = {
  [key in keyof typeof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
};

export type ProtocolFeaturesData = {
  [key in keyof typeof ChainAbbrEnum]?: FeatureDto;
};

export type FeaturesType = FeatureEnum[] | ProtocolFeaturesInfo;
