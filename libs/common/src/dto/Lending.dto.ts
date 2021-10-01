import { ProtocolTypeEnum } from '..';
import { LendingPositionDto } from './LendingPosition.dto';
import { BaseData } from './transactions.dto';

export class Lending extends BaseData<ProtocolTypeEnum.lending> {
  lendingPositions: LendingPositionDto[] = [];
}
