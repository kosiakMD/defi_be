import { ProtocolTypeEnum } from '..';
import { BaseData } from './BaseData';
import { BorrowingPosition } from './BorrowingPosition.dto';

export class Borrowing extends BaseData<ProtocolTypeEnum.borrowing> {
  borrowingPositions: BorrowingPosition[] = [];
}
