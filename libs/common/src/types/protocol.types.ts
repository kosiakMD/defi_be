// export type ProtocolFeatures = Record<ChainAbbrEnum, FeatureEnum[]>;
import { FeatureEnum } from '@app/common/enum';

import { ChainAbbrEnum } from '../enum';
import { FeatureDto, Features } from './features.types';

export type ProtocolFeaturesInfo = {
  [key in keyof typeof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
  // [key in keyof typeof ChainAbbrEnum]?: FeatureDto;
};

export type ProtocolFeaturesData<T extends Features> = {
  // [key in keyof typeof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
  [key in keyof typeof ChainAbbrEnum]?: FeatureDto<T>;
};

export type FeaturesType = FeatureEnum[] | ProtocolFeaturesInfo;
