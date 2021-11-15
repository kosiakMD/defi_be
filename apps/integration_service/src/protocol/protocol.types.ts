import { FeatureEnum } from '@app/common';
import { ChainAbbrEnum, ChainIdEnum, ProjectEnum } from '@app/common/enum';
import { Address, FeatureResultDto, ProtocolName } from '@app/common/types';

import { AccountService } from '../account/account.service';
import { FeatureDto } from '../integrations/integrationFeatures';
import { Logger } from '../logger/logger.service';
import { PriceService } from '../price/price.service';
import { DefaultDataProvider } from './protocols.dto';

export type ProtocolFeaturesData = {
  // [key in keyof typeof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
  [key in keyof typeof ChainAbbrEnum]?: FeatureDto;
};

// export type ProtocolFeatures = Record<ChainAbbrEnum, FeatureEnum[]>;
export type ProtocolFeaturesInfo = {
  [key in keyof typeof ChainAbbrEnum]?: FeatureEnum[];
  // [key in keyof ChainAbbrEnum]?: FeatureEnum | FeatureEnum[];
  // [key in keyof typeof ChainAbbrEnum]?: FeatureDto;
};

export type FeaturesType = FeatureEnum[] | ProtocolFeaturesInfo;

export type BasicProtocolType<DataProvider extends DefaultDataProvider = DefaultDataProvider> = {
  [key in keyof typeof FeatureEnum]?: (
    address: Address,
    chainId?: ChainIdEnum,
  ) => FeatureResultDto<any>;
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
