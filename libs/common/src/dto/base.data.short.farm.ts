import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { IntegrationShortFarmPositionDto } from '../jobs/staking';

export class BaseDataShortFarm extends BaseData<ProtocolTypeEnum.shortFarm> {
  items: IntegrationShortFarmPositionDto[];
}
