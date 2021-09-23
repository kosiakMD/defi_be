import { ProtocolTypeEnum } from '..';
import { BorrowingPosition } from './BorrowingPosition.dto';
import { BaseData } from './transactions.dto';

export class Borrowing extends BaseData<ProtocolTypeEnum.borrowing> {
  borrowingPositions: BorrowingPosition[];
}
