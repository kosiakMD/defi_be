import {
  BaseData,
  LeverageBorrowingTokenDto,
  LeverageErcToken,
  ProtocolTypeEnum,
} from '@app/common';

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
