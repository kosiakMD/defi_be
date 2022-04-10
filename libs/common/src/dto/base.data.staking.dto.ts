import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { IntegrationStakingPositionDto } from '../jobs/staking';

export class BaseDataStaking extends BaseData<ProtocolTypeEnum.staking> {
  items: IntegrationStakingPositionDto[];
  locked?: number;
}
