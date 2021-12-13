// eslint-disable-next-line max-classes-per-file
import { ChainIdEnum, FeatureEnum, ProtocolName } from '@app/common';

export class NotifyPayloadFeaturesDto {
  chain: ChainIdEnum;
  protocolName: ProtocolName;
  featureName: FeatureEnum.pools;
  items: any[];
}
