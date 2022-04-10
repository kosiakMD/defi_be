import { ProtocolTypeEnum } from '../enum';
import { BaseData } from './BaseData';
import { LendingPositionDto } from './LendingPosition.dto';

export class BaseDataLending extends BaseData<ProtocolTypeEnum.lending> {
    items: LendingPositionDto[];
}
