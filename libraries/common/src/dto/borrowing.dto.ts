import { ProtocolTypeEnum } from '..';
import { BaseData } from './base-data';
import { BorrowingPosition } from './borrowing-position.dto';

export class Borrowing extends BaseData<ProtocolTypeEnum.borrowing> {
  borrowingPositions: BorrowingPosition[] = [];
}
