import { ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { IntegrationShortFarmPositionDto } from '@app/common/jobs/staking';

export class BaseDataShortFarm extends BaseData<ProtocolTypeEnum.shortFarm> {
  items: IntegrationShortFarmPositionDto[];
}
