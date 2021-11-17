import { ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

export class BaseDataStaking extends BaseData<ProtocolTypeEnum.staking> {
  items: IntegrationStakingPositionDto[];
}
