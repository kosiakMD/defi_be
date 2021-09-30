import { ProtocolTypeEnum } from '..';
import { LendingPosition } from './LendingPosition.dto';
import { BaseData } from './transactions.dto';

export class Lending extends BaseData<ProtocolTypeEnum.lending> {
  lendingPositions: LendingPosition[] = [];
}
