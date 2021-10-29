// eslint-disable-next-line max-classes-per-file
import { ChainIdEnum } from '@app/common/enum';
import { FeatureName, ProtocolName } from '@app/common/types';

import { IntegrationStakingPositionDto } from '../../../../jobs/pools/src/jobs/integrations.dto';

export class NotifyPayloadStakingFeaturesDto {
  chain: ChainIdEnum;
  protocolName: ProtocolName;
  featureName: FeatureName;
  items: IntegrationStakingPositionDto[];
}
