import {
  ProtocolTypeEnum,
} from '../enum';
import { LeverageBorrowingTokenDto, LeverageErcToken } from '../dto';
import { BaseData } from './index';

export interface LeverageFarmingPosition {
  address: string;
  borrowToken?: LeverageBorrowingTokenDto;
  earned?: number;
  debtRatio?: number;
  farmToken?: LeverageErcToken;
}

export interface LeverageFarming extends BaseData<ProtocolTypeEnum.leverageFarming> {
  leverageFarmingPositions: LeverageFarmingPosition[];
}
