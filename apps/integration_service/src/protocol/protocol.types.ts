import { ChainAbbrEnum, ChainIdEnum, ProjectEnum } from '@app/common/enum';
import { Address, ProtocolName } from '@app/common/types';

import { Logger } from '../Logger/Logger.service';
import { AccountService } from '../account/account.service';
import { FeatureDto } from '../integrations/integrationFeatures';
import { PriceService } from '../price/price.service';
import { FeatureEnum } from './features/features.enum';
import { FeatureResult } from './features/features.types';
import { DefaultDataProvider } from './protocols.dto';

// export type ProtocolFeatures = Record<ChainAbbrEnum, FeatureEnum[]>;
export type ProtocolFeaturesInfo = {
  [key in keyof typeof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
  // [key in keyof typeof ChainAbbrEnum]?: FeatureDto;
};

export type ProtocolFeaturesData = {
  // [key in keyof typeof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
  [key in keyof typeof ChainAbbrEnum]?: FeatureDto;
};

export type BasicProtocolType<DataProvider extends DefaultDataProvider = DefaultDataProvider> = {
  [key in keyof typeof FeatureEnum]?: (address: Address, chainId?: ChainIdEnum) => FeatureResult;
} & {
  readonly chains: ChainAbbrEnum[];
  readonly project: ProjectEnum;
  readonly name: ProtocolName;
  readonly label: string;
  features: ProtocolFeaturesInfo;
  dataProvider?: DataProvider;
  readonly accountService: AccountService;
  readonly priceService: PriceService;
  readonly feeRate: number;
  readonly logger: Logger;
  getFeaturesInfo: (chainId?: ChainIdEnum) => any;
  getInfo: (chainId?: ChainIdEnum) => any;
  getAllFeaturesData: (address: string, chainId?: ChainIdEnum) => any;
};

export type FeaturesType = FeatureEnum[] | ProtocolFeaturesInfo;
