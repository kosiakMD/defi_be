import { ProtocolTypeEnum } from '@app/common';

import { LPToken } from '../../../../../common/dto';
import { BaseData, BorrowToken } from '../../../../../common/interfaces/transactions.interfaces';

import { LeverageErcToken } from '../dto/alpaca.dto';

export interface LeverageFarmingPosition {
  address: string;
  borrowToken: BorrowToken;
  earned?: number;
  debtRatio?: number;
  farmToken?: LPToken | LeverageErcToken;
}

export interface LeverageFarming extends BaseData<ProtocolTypeEnum.leverageFarming> {
  leverageFarmingPositions: LeverageFarmingPosition[];
}
