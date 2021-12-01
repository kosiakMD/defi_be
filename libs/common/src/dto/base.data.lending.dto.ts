import { ProtocolTypeEnum } from '@app/common';
import { LendingPositionDto } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';

export class BaseDataLending extends BaseData<ProtocolTypeEnum.lending> {
  items: LendingPositionDto[];
}
