import { ChainAbbrEnum, ChainIdEnum } from '../common/enum';
import { Address } from '../common/types';

import { FeatureDto } from '../integrations/integrationFeatures';
import { FeatureEnum } from './features/features.enum';
import { FeatureResult } from './features/features.types';

// export type ProtocolFeatures = Record<ChainAbbrEnum, FeatureEnum[]>;
export type ProtocolFeaturesInfo = {
  [key in keyof typeof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
  // [key in keyof typeof ChainAbbrEnum]?: FeatureDto;
};

export type ProtocolFeaturesData = {
  // [key in keyof typeof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
  [key in keyof typeof ChainAbbrEnum]?: FeatureDto;
};

export type BasicProtocolType = {
  [key in keyof typeof FeatureEnum]?: (address: Address, chainId?: ChainIdEnum) => FeatureResult;
} & {
  getFeaturesInfo: (chainId?: ChainIdEnum) => any;
  getInfo: (chainId?: ChainIdEnum) => any;
  getAllFeaturesData: (address: string, chainId?: ChainIdEnum) => any;
};

export type FeaturesType = FeatureEnum[] | ProtocolFeaturesInfo;
