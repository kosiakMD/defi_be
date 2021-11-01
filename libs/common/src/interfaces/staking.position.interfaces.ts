// eslint-disable-next-line max-classes-per-file
import { ChainIdEnum } from '@app/common/enum';
import { FeatureName, ProtocolName } from '@app/common/types';

export class NotifyPayloadStakingFeaturesDto {
  chain: ChainIdEnum;
  protocolName: ProtocolName;
  featureName: FeatureName;
  items: any[];
}
