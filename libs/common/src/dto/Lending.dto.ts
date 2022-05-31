import { ProtocolTypeEnum } from '..';
import { BaseData } from './BaseData';
import { LendingPositionDto } from './LendingPosition.dto';

export class Lending extends BaseData<ProtocolTypeEnum.lending> {
  lendingPositions: LendingPositionDto[] = [];
}
