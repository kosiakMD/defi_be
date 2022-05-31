import { LendingPositionDto, ProtocolTypeEnum } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';

export class BaseDataLending extends BaseData<ProtocolTypeEnum.lending> {
  items: LendingPositionDto[];
}
