// eslint-disable-next-line max-classes-per-file
import { ChainIdEnum } from '@app/common';

export class NotifyPayloadFeaturesDto {
  chain: ChainIdEnum;
  protocolName: string; // must be ProtocolNameEnum!
  featureName: string; // must be FeatureNameEnum!
  items: any[];
}

export class ProtocolsResponseData {
  status: string;
  errors: any;
  data: {
    name: string;
    project: string;
    features: {
      chain: {
        id: number;
      };
      list: string[];
    }[];
  }[];
}
