import { ProtocolTypeEnum } from '@app/common';

import { LPToken } from '../integrations/integrations.dto';
import { BaseData, BorrowToken, LeverageErcToken } from './transactions.interfaces';

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
