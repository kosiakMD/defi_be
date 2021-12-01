import { ChainIdEnum, FeatureName, ProtocolName } from '@app/common';
import { NotifySupportedFeature } from '@app/common/jobs/notify.dto';

export interface JobInterface {
  chain: ChainIdEnum;
  protocol: ProtocolName;
  feature: FeatureName;
  placeholder: string;
  manageMapping(): Promise<void>;
  updateWithChainData(): Promise<NotifySupportedFeature[]>;
}
