import { ProtocolTypeEnum } from '..';
import { BaseData } from './base-data';
import { LendingPositionDto } from './lending-position.dto';

export class Lending extends BaseData<ProtocolTypeEnum.lending> {
  lendingPositions: LendingPositionDto[] = [];
}
